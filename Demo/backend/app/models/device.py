from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DeviceInDB(BaseModel):
    id: str = Field(..., alias="_id")
    deviceId: str
    userId: str
    publicKey: str
    status: str = "active"
    currentChallenge: Optional[str] = None
    currentChallengeExpiresAt: Optional[datetime] = None
    lastSeenAt: Optional[datetime] = None