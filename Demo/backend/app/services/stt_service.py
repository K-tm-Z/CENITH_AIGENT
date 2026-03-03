async def transcribe_audio(audio: bytes, mime_type: str | None, segment_type: str | None):
    if not audio:
        return {"transcript": "", "segmentType": segment_type or "unknown"}

    approx_kb = round(len(audio) / 1024)
    transcript = (
        f'STT not configured. Received {approx_kb}KB of {mime_type or "unknown"} '
        f'audio for segment type "{segment_type or "unspecified"}".'
    )
    return {"transcript": transcript, "segmentType": segment_type or "unknown"}