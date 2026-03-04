from langchain_core.tools import tool
from typing import Optional, Literal

class ParamedicAgentTools:
    
    @tool
    def log_teddy_bear_gift(
        paramedic_name: str, 
        recipient_age: int, 
        recipient_gender: str, 
        recipient_type: str
    ) -> str:
        """
        Official log for the Pediatric Comfort Program. 
        Used when a teddy bear is distributed.
        """
        # This matches your TeddyBearForm fields
        return f"DATABASE_SUCCESS: Teddy bear gift recorded by {paramedic_name} for a {recipient_age}yo {recipient_gender} {recipient_type}."

    @tool
    def log_occurrence_report(
        call_number: str,
        occurrence_type: str,
        brief_description: str,
        vehicle_number: str,
        badge_number: str,
        police_involved: bool = False,
        fire_involved: bool = False
    ) -> str:
        """
        The primary tool for logging official Occurrence Reports. 
        Call this when a paramedic describes a scene, police arrival, or vehicle involvement.
        """
        status = f"Police: {police_involved}, Fire: {fire_involved}"
        return f"RECORDS_UPDATED: Report {call_number} ({occurrence_type}) filed by Badge {badge_number}. {status}."

   