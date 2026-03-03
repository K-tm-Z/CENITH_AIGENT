from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

class EnrollDeviceReq(BaseModel):
    idNumber: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    oneTimeCode: str
    publicKey: str

@router.post("/enroll-device", status_code=201)
async def enroll_device(body: EnrollDeviceReq):
    data, err = await auth_service.enroll_device(
        body.idNumber, body.oneTimeCode, body.publicKey, body.firstName, body.lastName
    )
    if err:
        msg, code = err
        raise HTTPException(status_code=code, detail=msg)
    return data

class GetChallengeReq(BaseModel):
    deviceId: str

@router.post("/get-challenge")
async def get_challenge(body: GetChallengeReq):
    data, err = await auth_service.get_challenge(body.deviceId)
    if err:
        msg, code = err
        raise HTTPException(status_code=code, detail=msg)
    return data

class VerifyAssertionReq(BaseModel):
    deviceId: str
    challenge: str
    assertion: str

@router.post("/verify-assertion")
async def verify_assertion(body: VerifyAssertionReq):
    data, err = await auth_service.verify_assertion(body.deviceId, body.challenge, body.assertion)
    if err:
        msg, code = err
        raise HTTPException(status_code=code, detail=msg)
    return data