import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException
from ..db import get_db
from ..config import settings
from .mm_service import bytes_to_data_url, extract_payload_multimodal
from .render_service import render_pdf_bytes, dict_to_xml_bytes
from .email_service import send_email_with_attachments


def _ensure_storage_dir(*parts: str) -> str:
    path = os.path.join(settings.STORAGE_DIR, *parts)
    os.makedirs(path, exist_ok=True)
    return path


async def get_active_template(form_type: str) -> Dict[str, Any]:
    db = get_db()
    doc = await db["form_templates"].find_one({"formType": form_type, "status": "active"}, sort=[("version", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail=f"Unknown formType: {form_type}")
    return doc


async def parse_transcription(
    *,
    form_type: str,
    transcript: str,
    filled_form_image_bytes: Optional[bytes],
    filled_form_image_mime: Optional[str],
) -> Dict[str, Any]:
    """
    Extract a structured payload for the given form type from a raw transcript,
    using the active form template, its JSON schema, and the associated images.
    """
    template = await get_active_template(form_type)

    # load template images from disk
    template_imgs = []
    for p in template.get("templateImagePaths", []):
        try:
            with open(p, "rb") as f:
                b = f.read()
            # assume png/jpg by extension; you can store mime in DB if needed
            mime = "image/png" if p.lower().endswith(".png") else "image/jpeg"
            template_imgs.append(await bytes_to_data_url(b, mime))
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail=f"Template image missing on server: {p}")

    filled_img = None
    if filled_form_image_bytes and filled_form_image_mime:
        filled_img = await bytes_to_data_url(filled_form_image_bytes, filled_form_image_mime)

    json_schema = template.get("jsonSchema") or {}
    rules = (template.get("promptSpec") or {}).get("rules") or [
        "Return ONLY valid JSON.",
        "No extra keys; match schema.",
        "Missing values -> empty string.",
    ]

    payload = await extract_payload_multimodal(
        transcript=transcript,
        json_schema=json_schema,
        rules=rules,
        template_images=template_imgs,
        filled_image=filled_img,
    )

    # (Optional but strongly recommended) validate against JSON Schema.
    # If you want strict enforcement, add `jsonschema` dependency and validate here.

    return payload


async def process_form_pipeline(
    *,
    form_type: str,
    transcript: str,
    filled_form_image_bytes: Optional[bytes],
    filled_form_image_mime: Optional[str],
) -> Dict[str, Any]:
    payload = await parse_transcription(
        form_type=form_type,
        transcript=transcript,
        filled_form_image_bytes=filled_form_image_bytes,
        filled_form_image_mime=filled_form_image_mime,
    )

    template = await get_active_template(form_type)

    pdf_bytes = render_pdf_bytes(form_type, payload)
    xml_bytes = dict_to_xml_bytes(root_name=form_type, payload=payload)

    run_id = str(uuid.uuid4())
    run_dir = _ensure_storage_dir("runs", run_id)

    pdf_path = os.path.join(run_dir, f"{form_type}.pdf")
    xml_path = os.path.join(run_dir, f"{form_type}.xml")
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)
    with open(xml_path, "wb") as f:
        f.write(xml_bytes)

    # persist run
    db = get_db()
    recipient_email = settings.FORMS_RECIPIENT_EMAIL or settings.SMTP_FROM

    await db["form_runs"].insert_one({
        "runId": run_id,
        "formType": form_type,
        "templateVersion": template.get("version"),
        "transcript": transcript,
        "payload": payload,
        "pdfPath": pdf_path,
        "xmlPath": xml_path,
        "emailedTo": recipient_email,
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })

    # send email with generated artifacts
    send_email_with_attachments(
        to_email=recipient_email,
        subject=f"{form_type} output",
        body="Attached are the generated PDF and XML outputs.",
        attachments=[
            (f"{form_type}.pdf", pdf_bytes, "application/pdf"),
            (f"{form_type}.xml", xml_bytes, "application/xml"),
        ],
    )

    # Mark run as sent; if email sending fails, record the failure but still return generation metadata.
    try:
        await db["form_runs"].update_one({"runId": run_id}, {"$set": {"status": "sent"}})
    except Exception as e:
        await db["form_runs"].update_one(
            {"runId": run_id},
            {"$set": {"status": "email_failed", "emailError": str(e)}},
        )

    return {
        "runId": run_id,
        "formType": form_type,
        "payload": payload,
        "pdfPath": pdf_path,
        "xmlPath": xml_path,
        "emailedTo": recipient_email,
        "status": "sent",
    }


async def create_form_template(
    *,
    form_type: str,
    display_name: str,
    version: int,
    json_schema_str: str,
    template_images: list[tuple[str, bytes]],  # [(filename, bytes)]
) -> Dict[str, Any]:
    db = get_db()

    try:
        json_schema = json.loads(json_schema_str)
    except Exception:
        raise HTTPException(status_code=400, detail="jsonSchema must be valid JSON")

    base_dir = _ensure_storage_dir("forms", form_type, f"v{version}")
    stored_paths = []
    for i, (filename, b) in enumerate(template_images):
        # normalize names
        ext = os.path.splitext(filename)[1].lower() or ".png"
        path = os.path.join(base_dir, f"template_{i+1}{ext}")
        with open(path, "wb") as f:
            f.write(b)
        stored_paths.append(path)

    # deactivate previous active versions
    await db["form_templates"].update_many(
        {"formType": form_type, "status": "active"},
        {"$set": {"status": "deprecated"}}
    )

    doc = {
        "formType": form_type,
        "displayName": display_name,
        "version": version,
        "status": "active",
        "templateImagePaths": stored_paths,
        "jsonSchema": json_schema,
        "promptSpec": {
            "rules": [
                "Return ONLY valid JSON (no markdown, no code fences).",
                "If unknown/not visible, use empty string.",
                "No extra keys; must conform to schema.",
                "Use transcript to fill fields; if a filled form photo is provided, prefer the photo."
            ]
        },
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    await db["form_templates"].insert_one(doc)
    return {"ok": True, "formType": form_type, "version": version, "templateImagePaths": stored_paths}