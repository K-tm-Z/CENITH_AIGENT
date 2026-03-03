# services/stt_service.py
from __future__ import annotations

import base64
import os
import sub:contentReference[oaicite:9]{index=9}m typing import Optional

import httpx

from ..config import settings


def _target_ext(fmt: str) -> str:
    f = (fmt or "").lower().strip()
    if f not in ("wav", "mp3"):
        return "wav"
    return f


def _run_ffmpeg_convert(in_path: str, out_path: str, target_fmt: str) -> None:
    """
    Convert input audio file -> target_fmt (wav/mp3).
    Uses PCM 16k mono for wav (good default for STT).
    """
    target_fmt = _target_ext(target_fmt)

    # Common STT-friendly normalization
    # wav: 16kHz mono PCM
    # mp3: 16kHz mono (bitrate modest)
    if target_fmt == "wav":
        cmd = [
            "ffmpeg", "-y",
            "-i", in_path,
            "-ac", "1",
            "-ar", "16000",
            "-c:a", "pcm_s16le",
            out_path,
        ]
    else:  # mp3
        cmd = [
            "ffmpeg", "-y",
            "-i", in_path,
            "-ac", "1",
            "-ar", "16000",
            "-c:a", "libmp3lame",
            "-b:a", "64k",
            out_path,
        ]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {proc.stderr.strip() or proc.stdout.strip()}")


def _guess_input_ext(mime_type: Optional[str]) -> str:
    mt = (mime_type or "").lower()
    if "webm" in mt:
        return "webm"
    if "wav" in mt or "x-wav" in mt:
        return "wav"
    if "mpeg" in mt or "mp3" in mt:
        return "mp3"
    if "mp4" in mt:
        return "mp4"
    if "ogg" in mt:
        return "ogg"
    if "flac" in mt:
        return "flac"
    if "aac" in mt:
        return "aac"
    return "bin"


def _extract_text_from_or_message_content(content) -> str:
    """
    OpenRouter/OpenAI-style responses can return:
      - content: "string"
      - content: [{type:"text", text:"..."} , ...]
    """
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for p in content:
            if isinstance(p, dict) and p.get("type") == "text" and isinstance(p.get("text"), str):
                parts.append(p["text"])
        return "\n".join(parts).strip()
    return ""


async def transcribe_audio(audio: bytes, mime_type: str | None, segment_type: str | None):
    if not audio:
        return {"transcript": "", "segmentType": segment_type or "unknown"}

    if not settings.OPENROUTER_API_KEY:
        return {"transcript": "", "segmentType": segment_type or "unknown", "error": "OPENROUTER_API_KEY missing"}

    target_fmt = _target_ext(settings.STT_TARGET_FORMAT)

    # Write input bytes -> temp file, convert -> target_fmt, read converted bytes.
    in_ext = _guess_input_ext(mime_type)
    with tempfile.TemporaryDirectory() as td:
        in_path = os.path.join(td, f"in.{in_ext}")
        out_path = os.path.join(td, f"out.{target_fmt}")

        with open(in_path, "wb") as f:
            f.write(audio)

        try:
            _run_ffmpeg_convert(in_path, out_path, target_fmt)
        except Exception as e:
            return {
                "transcript": "",
                "segmentType": segment_type or "unknown",
                "error": "Audio conversion failed",
                "detail": str(e),
            }

        with open(out_path, "rb") as f:
            converted = f.read()

    b64 = base64.b64encode(converted).decode("utf-8")

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    }
    # Optional attribution headers supported by OpenRouter :contentReference[oaicite:10]{index=10}
    if settings.OPENROUTER_HTTP_REFERER:
        headers["HTTP-Referer"] = settings.OPENROUTER_HTTP_REFERER
    if settings.OPENROUTER_APP_TITLE:
        headers["X-OpenRouter-Title"] = settings.OPENROUTER_APP_TITLE

    # OpenRouter audio input uses /chat/completions with input_audio parts :contentReference[oaicite:11]{index=11}
    payload = {
        "model": settings.STT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {"data": b64, "format": target_fmt},
                    },
                    {
                        "type": "text",
                        "text": "Transcribe the audio. Return ONLY the transcript text.",
                    },
                ],
            }
        ],
        "temperature": 0,
    }

    url = f"{settings.OPENROUTER_BASE_URL}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        return {
            "transcript": "",
            "segmentType": segment_type or "unknown",
            "error": "OpenRouter request failed",
            "detail": str(e),
        }

    try:
        choice0 = (data.get("choices") or [])[0]
        msg = choice0.get("message") or {}
        transcript = _extract_text_from_or_message_content(msg.get("content"))
        return {"transcript": transcript, "segmentType": segment_type or "unknown"}
    except Exception as e:
        return {
            "transcript": "",
            "segmentType": segment_type or "unknown",
            "error": "Bad OpenRouter response shape",
            "detail": str(e),
            "raw": data,
        }