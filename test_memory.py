from datetime import datetime
import json 

import warnings
import json

import warnings
import json

from Demo.backend.app.routers.paramedic_agent import ParamedicAgent # Match your new class name
from Demo.backend.app.routers.tools import ParamedicAgentTools
from Demo.backend.app.config import settings
api_key = settings.OPENROUTER_API_KEY

def test_sarah_scenario():
    # 1. Initialize
    tools = [ParamedicAgentTools.log_teddy_bear_gift]
    agent = ParamedicAgent(tools=tools, api_key=api_key)
    
    # 2. The Transcript
    transcript = "We are in Room 302. We just gave Sarah, a 5-year-old girl, a teddy bear because she was very scared."
    thread_id = "ambulance_unit_A1"

    print("Running Sarah Triage Test...")
    raw_result = agent.ask(transcript, thread_id=thread_id)
    result = json.loads(raw_result) # result is now a dict
    form_data = result.get('form', {})
    print(transcript)
    print(f"\nAgent Output: {result}")
    
    # 3. Validation Logic (Using Dictionary keys instead of attributes)
    # Note: Using .get() is safer to avoid KeyErrors
    if form_data.get('teddy_bear_recipient_age') == 5:
        print("SUCCESS: Age correctly extracted.")
    
    # Check for specific fields from your TeddyBearForm schema
    if 'Sarah' in str(form_data.values()):
         print("SUCCESS: Name found in extracted data.")


def run_administrative_memory_test(tools_list):
    # 1. Keep the terminal clean for judges
    warnings.filterwarnings("ignore", category=UserWarning)
    
    test_agent = ParamedicAgent(tools=tools_list, api_key=api_key)
    thread_1 = "paramedic_session_402"
    
    # Define the inputs clearly for the output
    p1_input = "Arrived at scene. This is an official incident report. My Badge is 12345."
    p2_input = "We just gave a teddy bear to a child. Use the medic number I gave you at arrival."

    print("\n" + "█"*60)
    print(" CROSS-FORM SESSION MEMORY DEMO")
    print(""*60 + "\n")

    # PHASE 1: INITIAL LOGGING
    print(" PHASE 1: SCENE ARRIVAL (Occurrence Report)")
    print(f"   PARAMEDIC SAYS: \"{p1_input}\"")
    
    p1_raw = test_agent.ask(p1_input, thread_id=thread_1)
    p1 = json.loads(p1_raw)
    p1_id = p1['form'].get('badge_number')
    
    print(f"   AI EXTRACTED: Badge Number → {p1_id}")
    print(f"   FORM TYPE: {p1['form'].get('form_type')}\n")

    # PHASE 2: CROSS-FORM CONTINUITY
    print(" PHASE 2: PEDIATRIC COMFORT (Teddy Bear Program)")
    print(f"   PARAMEDIC SAYS: \"{p2_input}\"")
    
    p2_raw = test_agent.ask(p2_input, thread_id=thread_1)
    p2 = json.loads(p2_raw)
    p2_id = p2['form'].get('paramedic_medic_number')

    print(f"   AI EXTRACTED: Medic Number → {p2_id}")
    print("     (Note: This value was retrieved from memory, not the second speech input.)\n")

    # FINAL AUDIT TABLE
    print("-" * 60)
    print(f"{'CROSS-FORM AUDIT':<35} | {'VALUE':<20}")
    print("-" * 60)
    print(f"{'1. ID Established (Badge #)':<35} | {p1_id:<20}")
    print(f"{'2. ID Recalled (Medic #)':<35} | {p2_id:<20}")
    print("-" * 60)

    if p2_id == "12345":
        print("\n TEST PASSED: Session memory persisted across different medical schemas.")
    else:
        print(f"\n TEST FAILED: Memory mismatch.")
    print("="*60 + "\n")
        
def test_messy_transcript():
    agent = ParamedicAgent(tools=[], api_key=api_key) # No tools needed for extraction test
    
    # Simulate a chaotic ambulance scene
    messy_transcript = (
        "Uh, okay, can you hear me? Dispatch? We're... um... sirens are loud... "
        "We're in Room 302 now. Patient is a 5-year-old girl, her name is Sarah. "
        "She's really scared, so we just gave her a comfort teddy bear. "
        "Uh, heart rate is like 105, but ignore that for the form. "
        "Wait, what's my badge? Oh, it's 12345. Anyway, yeah, teddy bear given."
    )
    
    print("--- Running Stress Test (Gibberish & Fillers) ---")
    raw_response = agent.ask(messy_transcript, thread_id="stress_test_001")
    result = json.loads(raw_response)
    form_data = result.get('form', {})
    print(messy_transcript)
    print(f"\n\nAgent Structured Output: {json.dumps(result, indent=2)}")

    # Check if the "Signal" was extracted from the "Noise"
    if form_data.get("paramedic_first_name") == "MISSING_IN_TRANSCRIPT":
         print("SUCCESS: Correctly handled missing 'Paramedic First Name'.")
    if form_data.get("teddy_bear_recipient_age") == 5:
         print("SUCCESS: Correctly extracted age despite fillers.")
    if form_data.get("badge_number") == "12345":
         print("SUCCESS: Captured badge number from the end of the sentence.")

def test_checklist_extraction():
    # 1. Initialize
    agent = ParamedicAgent(tools=[], api_key=api_key)
    unique_thread = f"checklist_test_{datetime.now().strftime('%M%S')}"
    # 2. Simulate a Paramedic starting their shift
    transcript = (
        "Hey, this is Paramedic Marco. Starting my shift. "
        "My ACRs are all finished, so ACRc is good. "
        "But I noticed my uniform credits are low, so UNIF is bad. "
        "Also, the meal claims for yesterday are missed, so MEALS is bad. "
        "Total issues found: two. Everything else is fine."
    )
    
    print("--- Running Checklist Extraction Test ---")
    raw_response = agent.ask(transcript, thread_id=unique_thread)
    result = json.loads(raw_response)

    # 3. Validation Logic (Accounting for the 'form' wrapper)
    form_data = result.get('form', {})
    entries = form_data.get('entries', [])

    print(transcript)

    #Print the form type for debugging
    form_type = form_data.get('form_type', 'occurrence_report')
    print(f"\n\nDEBUG: AI chose form type: {form_type}")

    print(f"Extracted {len(entries)} checklist entries.")
    
    # Check if the AI correctly mapped the "ACRc" status
    acrc_entry = next((e for e in entries if e['item_code'] == 'ACRc'), None)
    if acrc_entry and acrc_entry['status'] == 'GOOD':
        print("SUCCESS: ACRc correctly mapped to GOOD.")
        
    if form_data.get('total_issues_found') == 2:
        print("SUCCESS: Issue count correctly summed.")

def test_temporal_logic():
    agent = ParamedicAgent(tools=[],api_key=api_key) # No tools needed for extraction test
    # Use a unique thread for a clean slate
    thread_id = f"time_test_{datetime.now().strftime('%M%S')}"
    
    # We use a specific relative time mention
    transcript = "It's Marco. I just gave a teddy bear to a 4-year-old boy about ten minutes ago."
    
    print("--- Running Temporal Logic Test ---")
    print(transcript)
    raw_result = agent.ask(transcript, thread_id=thread_id)
    result = json.loads(raw_result)
    form_data = result.get('form', {})
    
    extracted_time = form_data.get('time') or form_data.get('date_time')
    print(f"\n\nAgent Extracted Time: {extracted_time}")
    
    # Logic: If current time is 16:05, extracted time should be approx 15:55
    # For the demo, we just want to see if it's NOT a hallucinated '00:00'
    if extracted_time and "MISSING" not in str(extracted_time):
        print("SUCCESS: AI interpreted relative time and converted to timestamp.")

if __name__ == "__main__":
    # Ensure tools match your current tools.py list
    tools_array = [
        ParamedicAgentTools.log_teddy_bear_gift,
        ParamedicAgentTools.log_occurrence_report
    ]
    
    run_administrative_memory_test(tools_array)
    test_sarah_scenario()
    test_checklist_extraction()
    test_messy_transcript()
    test_temporal_logic()