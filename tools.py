from langchain_core.tools import tool

class ParamedicAgentTools:
# 2. The Toolset (The 'Hands' of your Agent) 
    
    @tool
    def log_teddy_bear_gift(name: str, gender: str, age: int) -> str:
        """Records when a comfort teddy bear is given to a patient."""
        # In a real app, this would write to your SQLite DB
        return f"SUCCESS: Comfort Teddy logged for {name} ({age}y/o {gender})."

    @tool
    def update_vehicle_inventory(item: str, status: str) -> str:
        """Updates the status of ambulance equipment (e.g., 'Oxygen Tank', 'Full')."""
        return f"INVENTORY UPDATE: {item} marked as {status}."

    @tool
    def log_incident_detail(detail: str) -> str:
        """Logs non-medical scene details (e.g., 'Police arrived at 12:45')."""
        return f"LOGGED: {detail}"