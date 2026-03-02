from pydantic import BaseModel, Field
from typing import Optional

class ParamedicForm(BaseModel):
    form_type: str = Field(description="The type of form, e.g., 'comfort_teddy' or 'vehicle_check'")
    patient_name: Optional[str] = Field(description="Patient's name for teddy bear logs")
    age: Optional[int] = Field(description="Patient's age")
    gender: Optional[str] = Field(description="Patient's gender")
    item_status: Optional[str] = Field(description="Status for vehicle inventory, e.g., 'Oxygen 45%'")
    summary: str = Field(description="A brief 1-sentence summary of the action taken")

