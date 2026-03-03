import base64
import json
import re
from typing import Any, Dict, List, Optional

import httpx
from ..config import settings


def _b64_data_url(image_bytes: bytes, mime: str) -> str:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def _strip_code_fences(s: str) -> str:
    # handles ```json ... ``` and ``` ... ```
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()


async def extract_payload_multimodal(
    *,
    transcript: str,
    json_schema: Dict[str, Any],
    rules: List[str],
    template_images: List[Dict[str, str]],  # [{"data_url": "..."}]
    filled_image: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Returns a dict that MUST conform to json_schema.
    This function only calls the model; validation should happen server-side.
    """

    if not settings.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    # System + user prompt pattern: schema-bound extraction
    system = (
        "You are a data extraction engine. "
        "You must output ONLY valid JSON that conforms exactly to the provided JSON Schema. "
        "No markdown, no code fences, no commentary."
    )

    user_text = {
        "type": "text",
        "text": (
            "Task: Produce JSON for the selected form.\n\n"
            f"Rules:\n- " + "\n- ".join(rules) + "\n\n"
            "Transcript (may contain dictated values):\n"
            f"{transcript}\n\n"
            "JSON Schema (must conform exactly):\n"
            f"{json.dumps(json_schema)}"
        ),
    }

    content: List[Dict[str, Any]] = [user_text]

    # Provide template images (reference layout)
    for img in template_images:
        content.append({"type": "image_url", "image_url": {"url": img["data_url"]}})

    # Provide filled image (if user captured the filled/checked form)
    if filled_image:
        content.append({"type": "image_url", "image_url": {"url": filled_image["data_url"]}})

    payload = {
        "model": settings.OPENROUTER_MM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
        "temperature": 0,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(f"{settings.OPENROUTER_BASE_URL}", headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()

    text = data["choices"][0]["message"]["content"]
    text = _strip_code_fences(text)

    try:
        return json.loads(text)
    except Exception as e:
        raise ValueError(f"Model did not return valid JSON. Raw: {text[:500]}") from e


async def bytes_to_data_url(image_bytes: bytes, mime: str) -> Dict[str, str]:
    return {"data_url": _b64_data_url(image_bytes, mime)}