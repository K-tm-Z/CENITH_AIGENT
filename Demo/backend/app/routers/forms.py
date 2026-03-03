from typing import List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from ..db import get_db
from ..models.form import FormInDB, FormFieldInDB
from ..services.form_service import create_form_template, process_form_pipeline, parse_transcription
from ..services.stt_service import transcribe_audio
from ..deps import require_auth

router = APIRouter(prefix="/api/forms", tags=["forms"])


@router.get("", response_model=List[FormInDB])
async def list_forms(user=Depends(require_auth), db=Depends(get_db)):
    """
    List active forms for selection in the client.
    """
    cursor = db["forms"].find({"isActive": True})
    docs = await cursor.to_list(length=200)
    return [FormInDB(**doc) for doc in docs]


@router.get("/{form_id}")
async def get_form(form_id: str, user=Depends(require_auth), db=Depends(get_db)):
    """
    Fetch a single form along with its fields for client-side rendering.
    """
    form_doc = await db["forms"].find_one({"_id": form_id})
    if not form_doc:
        raise HTTPException(status_code=404, detail="Form not found")

    fields_cursor = db["form_fields"].find({"formId": form_id})
    fields_docs = await fields_cursor.to_list(length=500)

    form = FormInDB(**form_doc)
    fields = [FormFieldInDB(**f) for f in fields_docs]
    return {"form": form, "fields": fields}


@router.post("/templates")
async def upload_template(
    formType: str = Form(...),
    displayName: str = Form(...),
    version: int = Form(...),
    jsonSchema: str = Form(...),
    templateImages: list[UploadFile] = File(...),
    user=Depends(require_auth),
):
    imgs = []
    for img in templateImages:
        b = await img.read()
        imgs.append((img.filename, b))

    return await create_form_template(
        form_type=formType,
        display_name=displayName,
        version=version,
        json_schema_str=jsonSchema,
        template_images=imgs,
    )


@router.post("/process")
async def process_form(
    formType: str = Form(...),

    # either audio or transcript
    audio: UploadFile | None = File(default=None),
    transcript: str | None = Form(default=None),

    # optional filled form photo
    filledFormImage: UploadFile | None = File(default=None),
    user=Depends(require_auth),
):
    if not transcript:
        if not audio:
            raise HTTPException(status_code=400, detail="Provide either transcript or audio")

        audio_bytes = await audio.read()
        stt_res = await transcribe_audio(audio=audio_bytes, mime_type=audio.content_type, segment_type="form")
        transcript = stt_res.get("transcript", "")

    filled_bytes = None
    filled_mime = None
    if filledFormImage:
        filled_bytes = await filledFormImage.read()
        filled_mime = filledFormImage.content_type

    return await process_form_pipeline(
        form_type=formType,
        transcript=transcript or "",
        filled_form_image_bytes=filled_bytes,
        filled_form_image_mime=filled_mime,
    )


@router.post("/{form_id}/fill")
async def fill_form_with_transcript(
    form_id: str,
    transcript: str = Form(...),
    filledFormImage: UploadFile | None = File(default=None),
    user=Depends(require_auth),
):
    """
    Fill a specific form using an already-obtained transcript.
    This endpoint is intended to be used together with the STT endpoint,
    where the client first calls /api/stt/transcribe and then passes the
    resulting transcript here.
    """
    filled_bytes = None
    filled_mime = None
    if filledFormImage:
        filled_bytes = await filledFormImage.read()
        filled_mime = filledFormImage.content_type

    # Use the same pipeline, treating form_id as form_type key.
    return await process_form_pipeline(
        form_type=form_id,
        transcript=transcript or "",
        filled_form_image_bytes=filled_bytes,
        filled_form_image_mime=filled_mime,
    )