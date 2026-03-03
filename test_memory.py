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
    form_data = result.get('form', {})
    print(f"Agent Output: {result}")
    
    # 3. Validation Logic (Using Dictionary keys instead of attributes)
    # Note: Using .get() is safer to avoid KeyErrors
    if form_data.get('teddy_bear_recipient_age') == 5:
        print("SUCCESS: Age correctly extracted.")
    
    # Check for specific fields from your TeddyBearForm schema
    if 'Sarah' in str(form_data.values()):
         print("SUCCESS: Name found in extracted data.")


def run_administrative_memory_test(tools_list):
    test_agent = ParamedicAgent(tools=tools_list)
    thread_1 = "paramedic_session_402"
    
    print("Starting Administrative Memory Test...\n")

    # Phase 1: Context Setting
    print("--- Phase 1: Scene Arrival ---")
    p1_raw = test_agent.ask(
        "Arrived at scene. This is an official incident report. Badge 12345.", 
        thread_id=thread_1
    )
    p1 = json.loads(p1_raw)
    print(f"Agent identified form: {p1['form'].get('form_type')}\n")

    # Phase 2: Recall
    print("--- Phase 2: Memory Recall ---")
    # We use a Teddy Bear transcript which requires 'paramedic_medic_number'
    p2_raw = test_agent.ask(
        "We just gave a teddy bear to a child. Use the medic number I gave you at arrival.", 
        thread_id=thread_1
    )
    p2 = json.loads(p2_raw)
    
    # SUCCESS CRITERIA:
    # In Sarah/Teddy form, it's 'paramedic_medic_number'. 
    # In Occurrence form, it's 'badge_number'.
    found_id = p2['form'].get('paramedic_medic_number') or p2['form'].get('badge_number')
    
    if found_id == "12345":
        print("SUCCESS: Agent remembered ID across forms.")
    else:
        print(f"FAIL: Agent returned {found_id}")
        
def test_messy_transcript():
    agent = ParamedicAgent(tools=[]) # No tools needed for extraction test
    
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
    print(f"Agent Structured Output: {json.dumps(result, indent=2)}")

    # Check if the "Signal" was extracted from the "Noise"
    if form_data.get("paramedic_first_name") == "MISSING_IN_TRANSCRIPT":
         print("SUCCESS: Correctly handled missing 'Paramedic First Name'.")
    if form_data.get("teddy_bear_recipient_age") == 5:
         print("SUCCESS: Correctly extracted age despite fillers.")
    if form_data.get("badge_number") == "12345":
         print("SUCCESS: Captured badge number from the end of the sentence.")

def test_checklist_extraction():
    # 1. Initialize
    agent = ParamedicAgent(tools=[]) 
    
    # 2. Simulate a Paramedic starting their shift
    transcript = (
        "Hey, this is Paramedic Marco. Starting my shift. "
        "My ACRs are all finished, so ACRc is good. "
        "But I noticed my uniform credits are low, so UNIF is bad. "
        "Also, the meal claims for yesterday are missed, so MEALS is bad. "
        "Total issues found: two. Everything else is fine."
    )
    
    print("--- Running Checklist Extraction Test ---")
    raw_response = agent.ask(transcript, thread_id="shift_start_marco")
    result = json.loads(raw_response)

    # 3. Validation Logic (Accounting for the 'form' wrapper)
    form_data = result.get('form', {})
    entries = form_data.get('entries', [])

    #Print the form type for debugging
    form_type = form_data.get('form_type', 'occurrence_report')
    print(f"DEBUG: AI chose form type: {form_type}")

    print(f"Extracted {len(entries)} checklist entries.")
    
    # Check if the AI correctly mapped the "ACRc" status
    acrc_entry = next((e for e in entries if e['item_code'] == 'ACRc'), None)
    if acrc_entry and acrc_entry['status'] == 'GOOD':
        print("SUCCESS: ACRc correctly mapped to GOOD.")
        
    if form_data.get('total_issues_found') == 2:
        print("SUCCESS: Issue count correctly summed.")


if __name__ == "__main__":
    # Ensure tools match your current tools.py list
    tools_array = [
        ParamedicAgentTools.log_teddy_bear_gift, 
   
        ParamedicAgentTools.log_occurrence_report
    ]
    
    run_administrative_memory_test(tools_array)
    # test_sarah_scenario()
    # test_checklist_extraction()
    # test_messy_transcript()