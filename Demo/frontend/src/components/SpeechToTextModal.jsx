import React, { useEffect, useState } from 'react'
import { postJson } from '../lib/api.js'
import { useWebSpeech } from '../lib/useWebSpeech.js'

export function SpeechToTextModal({
  open,
  onClose,
  onUploaded,
  accessToken,
  submissionId,
  templateId,
  patientId
}) {
  const speech = useWebSpeech({ lang: 'en-CA', continuous: true, interimResults: true })
  const [segmentType, setSegmentType] = useState('patient_summary')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      speech.reset()
      setError('')
      setBusy(false)
      setSegmentType('patient_summary')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const uploadTranscript = async () => {
    setBusy(true)
    setError('')
    try {
      if (!speech.finalText.trim()) {
        setError('No transcript captured yet.')
        return
      }

      const res = await postJson(
        '/api/uploads/speech-text',
        {
          submissionId,
          templateId,
          patientId,
          segmentType,
          transcript: speech.finalText
        },
        { accessToken }
      )

      onUploaded?.(res)
    } catch (e) {
      setError(e.message || 'Failed to attach transcript')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modalOverlay">
      <div className="modal card">
        <div className="row rowSpaceBetween">
          <h2>Speech to text</h2>
          <button className="secondary" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        {!speech.supported ? (
          <div className="toast toastError">
            SpeechRecognition not supported in this browser. Try Chrome/Edge.
          </div>
        ) : (
          <>
            <div className="field">
              <label>Segment type</label>
              <select value={segmentType} onChange={e => setSegmentType(e.target.value)}>
                <option value="patient_summary">patient_summary</option>
                <option value="equipment_used">equipment_used</option>
                <option value="notes">notes</option>
              </select>
            </div>

            <div className="row">
              <button
                type="button"
                className="secondary"
                onClick={speech.start}
                disabled={busy || speech.listening}
              >
                Start mic
              </button>
              <button
                type="button"
                className="secondary"
                onClick={speech.stop}
                disabled={busy || !speech.listening}
              >
                Stop
              </button>
              <button type="button" className="secondary" onClick={speech.reset} disabled={busy}>
                Clear
              </button>
            </div>

            <div className="field">
              <label>Transcript</label>
              <div className="codeBlock" style={{ whiteSpace: 'pre-wrap' }}>
                {(speech.finalText || '') + (speech.interim ? `\n\n(interim) ${speech.interim}` : '')}
              </div>
            </div>

            {speech.error ? <div className="toast toastError">{speech.error}</div> : null}
            {error ? <div className="toast toastError">{error}</div> : null}

            <button onClick={uploadTranscript} disabled={busy}>
              Attach transcript
            </button>
          </>
        )}
      </div>
    </div>
  )
}