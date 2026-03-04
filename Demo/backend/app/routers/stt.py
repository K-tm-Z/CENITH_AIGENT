import os
from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException
import json
from ..deps import require_auth  # whatever you use for JWT auth
from ..services.stt_service import transcribe_audio
from .paramedic_agent import ParamedicAgent
from dotenv import load_dotenv
from ..config import settings
# from . import audio_sam

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
        # test= "audio_sample.wav"
        result = await transcribe_audio(await audio.read(), audio.content_type, segmentType)
        raw_transcript = result.get("transcript", "")

        try:
            # Try the real AI first
            agent = ParamedicAgent(tools=[], api_key=settings.OPENROUTER_API_KEY)
            # agent = ParamedicAgent(tools=[])
            ai_extraction_raw = agent.ask(raw_transcript or "Simulated report", thread_id=threadId)
            return {
                "transcript": raw_transcript,
                "structured_data": json.loads(ai_extraction_raw),
                "status": "LIVE_AI"
            }
        except Exception as e:
            # LOG THE ERROR for your eyes only
            print(f"[DEMO DEBUG] AI Layer Failed: {e}")
            
            # RETURN THE MOCK DATA to keep the app running
            mock_medical_data = {
                "form_type": "occurrence_report",
                "date": "2026-03-04",
                "time": "10:35",
                "call_number": "DEMO-911-001",
                "occurrence_type": "Medical Emergency",
                "brief_description": f"Transcript received: {raw_transcript}. AI extraction simulated for demo.",
                "vehicle_number": "AMB-24",
                "badge_number": "MEDIC-77",
                "police": True,
                "fire_department": False,
                "observations": "Handshake delay detected; using local fallback schema.",
                "action_taken": "System bypassed cloud validation to maintain paramedic workflow."
            }
            
            return {
                "transcript": raw_transcript,
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
