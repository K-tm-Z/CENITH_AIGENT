from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from typing import Literal

class TeddyBearForm(BaseModel):
    date_time: datetime = Field(description="The date and time of the incident in YYYY-MM-DD HH:MM format")
    paramedic_first_name : str = Field(description="First name of the paramedic")
    paramedic_last_name : str = Field(description="Last name of the paramedic")
    paramedic_medic_number : str = Field(description="Medic number of the paramedic")
    second_paramedic_first_name : Optional[str] = Field(description="First name of the second paramedic, if applicable")
    second_paramedic_last_name : Optional[str] = Field(description="Last name of the second paramedic, if applicable")
    second_paramedic_medic_number : Optional[str] = Field(description="Medic number of the second paramedic, if applicable")
    teddy_bear_recipient_age: int = Field(description="Age of the teddy bear recipient")
    teddy_bear_recipient_gender: Literal['Male', 'Female', 'Other','Prefer not to say'] = Field(description="Gender of the teddy bear recipient")
    teddy_bear_recipient_type: Literal['Patient','Family', 'Bystander', 'Other'] = Field(description="Type of the teddy bear recipient")


class OcurrenceReport(BaseModel):
    date: str = Field(description="The date of the report in YYYY-MM-DD format.")
    time: str = Field(description="The time of the report in 24-hour HH:MM format.")
    call_number: str = Field(description="Unique identifier for the call")
    occurrence_type: str = Field(description="Type of the occurrence, e.g., 'Medical Emergency'")
    occurrence_reference_number: str = Field(description="Reference number for the occurrence")
    brief_description: str = Field(description="A brief description of the occurrence")
    classification: str = Field(description="Classification of the occurrence, e.g., 'Critical', 'Non-Critical'")
    classification_details: str = Field(description="Additional details about the classification")
    service: str = Field(description="Service provided, e.g., 'Ambulance Transport'")
    vehicle_number: str = Field(description="Number of the vehicle involved")
    vehicle_description: str = Field(description="Description of the vehicle, e.g., 'Ambulance Unit A1'")
    role: str = Field(description="Role of the paramedic, e.g., 'Driver', 'Primary Caregiver'")
    role_description: str = Field(description="Description of the role, e.g., 'Responsible for driving and navigation'")
    badge_number: str = Field(description="Badge number of the paramedic")
    fire_department: bool = Field(description="True if the paramedic mentions the Fire Department, 'Fire', or 'FD'. Otherwise, False.")
    police: bool = Field(description="True if the paramedic mentions 'Police', 'PD', or 'Cops'. Otherwise, False.")
    observations: str = Field(description="Any additional observations or notes about the occurrence")
    suggested_resolution: str = Field(description="Suggested resolution or next steps based on the occurrence details")
    action_taken: str = Field(description="Description of the action taken by the paramedic during the occurrence")
    management_notes:str = Field(description="Any notes on the management of the occurrence, e.g., 'Patient stabilized and transported to hospital'")
    requested_by: str = Field(description="Name of the person who requested the report, e.g., 'Chief Medical Officer'")
    requested_by_details: str = Field(description="Additional details about the requester, e.g., 'Dr. Jane Smith, Chief Medical Officer'")
    report_creator: str = Field(description="Name of the person creating the report, e.g., 'Paramedic John Doe'")
    report_creator_details: str = Field(description="Additional details about the report creator, e.g., 'Badge #12345, Driver'")
