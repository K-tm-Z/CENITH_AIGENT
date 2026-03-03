from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class SessionTokenInDB(BaseModel):
    id: str = Field(..., alias="_id")
    userId: str
    deviceId: str
    accessToken: str
    scopes: List[str]
    expiresAt: datetime
    revoked: bool = False