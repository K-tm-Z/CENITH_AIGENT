import os
import hashlib
import secrets
from datetime import datetime, timedelta
from jose import jwt
from bson import ObjectId

from ..config import settings
from ..db import get_client

def get_enrollment_code() -> str | None:
    return settings.DEVICE_ENROLLMENT_CODE or settings.ENROLLMENT_CODE

def compute_expected_assertion(challenge: str, public_key: str) -> str:
    raw = f"{challenge}:{public_key}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def _db():
    client = get_client()
    # If your URI includes a default DB, you can use get_default_database().
    # Otherwise, pick a DB name explicitly:
    return client.get_default_database()

async def enroll_device(idNumber: str, oneTimeCode: str, publicKey: str,
                        firstName: str | None, lastName: str | None):
    expected = get_enrollment_code()
    if expected and oneTimeCode != expected:
        return None, "Invalid one-time code"

    db = _db()
    users = db["users"]
    devices = db["devices"]

    user = await users.find_one({"idNumber": idNumber})
    if not user:
        user_doc = {
            "idNumber": idNumber,
            "firstName": firstName,
            "lastName": lastName,
            "status": "active",
            "role": "user",
            "allowedScopes": [],
        }
        ins = await users.insert_one(user_doc)
        user = {**user_doc, "_id": ins.inserted_id}
    else:
        update = {}
        if firstName and user.get("firstName") != firstName:
            update["firstName"] = firstName
        if lastName and user.get("lastName") != lastName:
            update["lastName"] = lastName
        if update:
            await users.update_one({"_id": user["_id"]}, {"$set": update})
            user.update(update)

    device_id = secrets.token_hex(16)  # substitute for crypto.randomUUID()
    device_doc = {
        "deviceId": device_id,
        "userId": str(user["_id"]),
        "publicKey": publicKey,
        "status": "active",
        "currentChallenge": None,
        "currentChallengeExpiresAt": None,
        "lastSeenAt": None,
    }
    await devices.insert_one(device_doc)

    return {
        "deviceId": device_id,
        "userId": str(user["_id"]),
        "user": {
            "id": str(user["_id"]),
            "idNumber": user["idNumber"],
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            "role": user.get("role", "user"),
        }
    }, None

async def get_challenge(deviceId: str):
    db = _db()
    devices = db["devices"]
    users = db["users"]

    device = await devices.find_one({"deviceId": deviceId})
    if not device:
        return None, "Device not found"

    user = await users.find_one({"_id": ObjectId(device["userId"])})
    if not user:
        return None, "Device not found"

    if device.get("status") != "active" or user.get("status") != "active":
        return None, "Device or user not active"

    challenge = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    await devices.update_one(
        {"_id": device["_id"]},
        {"$set": {"currentChallenge": challenge, "currentChallengeExpiresAt": expires_at}}
    )

    return {"deviceId": deviceId, "challenge": challenge, "expiresAt": expires_at}, None

async def verify_assertion(deviceId: str, challenge: str, assertion: str):
    if not settings.JWT_SECRET:
        return None, "JWT_SECRET is not configured"

    db = _db()
    devices = db["devices"]
    users = db["users"]
    session_tokens = db["session_tokens"]

    device = await devices.find_one({"deviceId": deviceId})
    if not device:
        return None, "Device not found"

    user = await users.find_one({"_id": ObjectId(device["userId"])})
    if not user:
        return None, "Device not found"

    if device.get("status") != "active" or user.get("status") != "active":
        return None, "Device or user not active"

    exp = device.get("currentChallengeExpiresAt")
    if (
        not device.get("currentChallenge")
        or device["currentChallenge"] != challenge
        or not exp
        or exp <= datetime.utcnow()
    ):
        return None, "Challenge is invalid or expired"

    expected = compute_expected_assertion(challenge, device["publicKey"])
    if expected != assertion:
        return None, "Invalid assertion"

    await devices.update_one(
        {"_id": device["_id"]},
        {"$set": {"currentChallenge": None, "currentChallengeExpiresAt": None, "lastSeenAt": datetime.utcnow()}}
    )

    scopes = user.get("allowedScopes") if isinstance(user.get("allowedScopes"), list) else []
    payload = {"sub": str(user["_id"]), "deviceId": deviceId, "scopes": scopes}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    await session_tokens.insert_one({
        "userId": str(user["_id"]),
        "deviceId": deviceId,
        "accessToken": token,
        "scopes": scopes,
        "expiresAt": expires_at,
        "revoked": False
    })

    return {
        "accessToken": token,
        "expiresAt": expires_at,
        "user": {
            "id": str(user["_id"]),
            "idNumber": user["idNumber"],
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            "role": user.get("role", "user"),
        },
        "deviceId": deviceId
    }, None