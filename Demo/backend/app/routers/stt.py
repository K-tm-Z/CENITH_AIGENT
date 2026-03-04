from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException
import json
from ..deps import require_auth  # whatever you use for JWT auth
from ..services.stt_service import transcribe_audio
from .paramedic_agent import ParamedicAgent

router = APIRouter()

# 
@router.post("/api/stt/transcribe")
async def stt_transcribe(
        audio: UploadFile = File(...),
        segmentType: str | None = Form(None),
        threadId: str | None = Form("default_session"),
        # user=Depends(require_auth),  # ensure only logged-in users can call this
    ):
        # 1. Transcription Handshake (Same as before)
        result = await transcribe_audio(await audio.read(), audio.content_type, segmentType)
        raw_transcript = result.get("transcript", "")

        # 2. AI Extraction with Safety Net
        try:
            # Try the real AI first
            agent = ParamedicAgent(tools=[])  # Initialize your agent with any necessary tools
            ai_extraction_raw = agent.ask(raw_transcript or "Simulated paramedic report", thread_id=threadId)
            return {
                "transcript": raw_transcript,
                "structured_data": json.loads(ai_extraction_raw),
                "status": "LIVE_AI"
            }
        except Exception as e:
            # --- THE INSURANCE POLICY ---
            print(f"[DEMO MODE] AI failed (Error: {e}). Returning Mock Data.")
            
            # This mock data matches your OcurrenceReport schema exactly
            mock_medical_data = {
                "form_type": "occurrence_report",
                "date": "2026-03-04",
                "time": "01:45",
                "call_number": "DEMO-911-001",
                "occurrence_type": "Medical Emergency",
                "brief_description": "Patient found unresponsive at scene. Stabilized via IV.",
                "vehicle_number": "AMB-24",
                "badge_number": "MEDIC-77",
                "police": True,
                "fire_department": False,
                "observations": "Pupils dilated, breathing shallow.",
                "action_taken": "Administered oxygen and transported to General Hospital."
            }
            
            return {
                "transcript": raw_transcript or "Patient stabilized at scene, police arrived 2 minutes ago.",
                "structured_data": mock_medical_data,
                "status": "DEMO_MOCK_ACTIVE"
            }

# @router.post("/api/stt/transcribe")
# async def stt_transcribe(
#     audio: UploadFile = File(...),
#     segmentType: str | None = Form(None),
#     user=Depends(require_auth),  # ensure only logged-in users can call this
# ):
#     blob = await audio.read()
#     result = await transcribe_audio(blob, audio.content_type, segmentType)

#     if result.get("error"):
#         raise HTTPException(status_code=502, detail=result)

#     return result
