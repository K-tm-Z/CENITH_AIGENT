from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException

from ..deps import require_auth  # whatever you use for JWT auth
from ..services.stt_service import transcribe_audio

router = APIRouter()

@router.post("/api/stt/transcribe")
async def stt_transcribe(
    audio: UploadFile = File(...),
    segmentType: str | None = Form(None),
    user=Depends(require_auth),  # ensure only logged-in users can call this
):
    blob = await audio.read()
    result = await transcribe_audio(blob, audio.content_type, segmentType)

    if result.get("error"):
        raise HTTPException(status_code=502, detail=result)

    return result