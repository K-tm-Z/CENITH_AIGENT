from pydantic import BaseModel, Field
from typing import List, Optional

class UserInDB(BaseModel):
    id: str = Field(..., alias="_id")
    idNumber: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    status: str = "active"
    role: str = "user"
    allowedScopes: List[str] = []

class UserPublic(BaseModel):
    id: str
    idNumber: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: str