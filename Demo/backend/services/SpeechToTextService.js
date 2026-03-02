/**
 * Minimal speech-to-text stub.
 *
 * In production, send audio buffers to a real STT provider.
 * For now, optionally call an LLM with a short description, or just return
 * a placeholder transcript so the rest of the pipeline keeps working.
 */
async function transcribeAudio(buffer, { mimeType, segmentType }) {
  if (!buffer || !buffer.length) {
    return {
      transcript: '',
      segmentType: segmentType || 'unknown'
    }
  }

  // No real STT integration yet; keep this as a descriptive placeholder.
  const approxKb = Math.round(buffer.length / 1024)

  const transcript = `STT not configured. Received ${approxKb}KB of ${mimeType ||
    'unknown'} audio for segment type "${segmentType || 'unspecified'}".`

  return {
    transcript,
    segmentType: segmentType || 'unknown'
  }
}

module.exports = {
  transcribeAudio
}

