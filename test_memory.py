import json

from paramedic_agent import ParamedicAgent # Match your new class name
from tools import ParamedicAgentTools

def test_sarah_scenario():
    # 1. Initialize
    tools = [ParamedicAgentTools.log_teddy_bear_gift]
    agent = ParamedicAgent(tools=tools)
    
    # 2. The Transcript
    transcript = "We are in Room 302. We just gave Sarah, a 5-year-old girl, a teddy bear because she was very scared."
    thread_id = "ambulance_unit_A1"

    print("Running Sarah Triage Test...")
    raw_result = agent.ask(transcript, thread_id=thread_id)
    result = json.loads(raw_result) # result is now a dict

    print(f"Agent Output: {result}")
    
    # 3. Validation Logic (Using Dictionary keys instead of attributes)
    # Note: Using .get() is safer to avoid KeyErrors
    if result.get('teddy_bear_recipient_age') == 5:
        print("SUCCESS: Age correctly extracted.")
    
    # Check for specific fields from your TeddyBearForm schema
    if 'Sarah' in str(result.values()):
         print("SUCCESS: Name found in extracted data.")
# def run_administrative_memory_test(tools_list):
#     # Initialize the agent (it handles its own prompt internally now)
#     test_agent = ParamedicAgent(tools=tools_list)
    
#     # Define a consistent thread for the first paramedic
#     thread_1 = "paramedic_session_402"
    
#     print("Starting Administrative Memory Test...\n")

#     # Phase 1: Context Setting (Implicit Information)
#     print("--- Phase 1: Scene Arrival & Vehicle Check ---")
#     p1 = test_agent.ask(
#         "Arrived at scene. Oxygen tank is at 45% and the sirens are functioning.", 
#         thread_id=thread_1
#     )
#     print(f"Agent Logged: {p1}\n")

#     # Phase 2: Comfort Care & Context Recall
#     print("--- Phase 2: Comfort Teddy & Recall ---")
#     # We test if the agent remembers the oxygen level from Turn 1 while processing a new Teddy Bear log
#     p2 = test_agent.ask(
#         "We just gave a teddy bear to a 6-year-old boy named Leo. "
#         "Also, can you remind me what our oxygen level was when we arrived?", 
#         thread_id=thread_1
#     )
#     print(f"Agent Response: {p2}\n")

#     # Phase 3: Thread Isolation (New Paramedic/Ambulance)
#     print("--- Phase 3: Testing Thread Isolation ---")
#     thread_2 = "paramedic_session_999"
#     p3 = test_agent.ask(
#         "What is the status of my oxygen tank?", 
#         thread_id=thread_2
#     )
#     print(f"Agent (Thread 2): {p3}")
#     print("\nTest Complete. Thread 2 should NOT know about the 45% oxygen level from Thread 1.")

if __name__ == "__main__":
    # Ensure tools match your current tools.py list
    tools_array = [
        ParamedicAgentTools.log_teddy_bear_gift, 
        ParamedicAgentTools.update_vehicle_inventory, 
        ParamedicAgentTools.log_incident_detail
    ]
    
    # run_administrative_memory_test(tools_array)
    test_sarah_scenario()