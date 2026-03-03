from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from ..services.stt_service import transcribe_audio

router = APIRouter(prefix="/api", tags=["stt"])

@router.post("/stt")
async def stt(
    audio: UploadFile = File(...),
    segmentType: str | None = Form(default=None),
):
    data = await audio.read()
    if data is None:
        raise HTTPException(status_code=400, detail="No audio provided")

    return await transcribe_audio(
        audio=data,
        mime_type=audio.content_type,
        segment_type=segmentType,
    )