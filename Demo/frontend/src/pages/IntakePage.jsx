import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { postForm } from '../lib/api.js'
import { STORAGE_KEYS } from '../lib/constants.js'
import { cacheSubmission } from '../lib/submissionCache.js'
import { SpeechToTextModal } from '../components/SpeechToTextModal.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export function IntakePage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const existingSubmissionId = useMemo(
    () => localStorage.getItem(STORAGE_KEYS.lastSubmissionId) || '',
    [],
  )

  const [templateId, setTemplateId] = useState('')
  const [patientId, setPatientId] = useState('')
  const [attachToSubmission, setAttachToSubmission] = useState(true)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [speechOpen, setSpeechOpen] = useState(false)

  const activeSubmissionId = attachToSubmission ? existingSubmissionId : ''

  const handleUpload = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      if (!file) {
        setError('Choose a file first.')
        return
      }
      const form = new FormData()
      form.append('file', file)
      if (templateId) form.append('templateId', templateId)
      if (patientId) form.append('patientId', patientId)
      if (activeSubmissionId) form.append('submissionId', activeSubmissionId)

      setStatus('Uploading + extracting…')
      const res = await postForm('/api/uploads/documents', form, { accessToken })
      localStorage.setItem(STORAGE_KEYS.lastSubmissionId, res.submissionId)
      cacheSubmission(res.submissionId, res.structuredData)
      setStatus('Done.')
      navigate(`/review/${res.submissionId}`)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Intake</h1>
        <p className="muted">
          Upload a document (PDF/image) or record a voice segment. Each action creates or updates a
          single <span className="mono">FormSubmission</span>.
        </p>
      </div>

      <div className="grid2">
        <form className="card" onSubmit={handleUpload}>
          <h2>Document upload</h2>

          <div className="field">
            <label>Template ID (optional)</label>
            <input
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              placeholder="Mongo ObjectId"
            />
          </div>

          <div className="field">
            <label>Patient ID (optional)</label>
            <input value={patientId} onChange={e => setPatientId(e.target.value)} />
          </div>

          <div className="field">
            <label>Attach to existing submission</label>
            <div className="row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={attachToSubmission}
                  onChange={e => setAttachToSubmission(e.target.checked)}
                />
                Use last submission
              </label>
              {existingSubmissionId ? (
                <span className="mono">{existingSubmissionId}</span>
              ) : (
                <span className="muted">No previous submission yet.</span>
              )}
            </div>
          </div>

          <div className="field">
            <label>File</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <button disabled={busy}>Upload</button>
        </form>

        <div className="card">
          <h2>Speech to text</h2>
          <p className="muted">
            Record a segment and the backend will attach a transcript to the submission.
          </p>
          <button className="secondary" onClick={() => setSpeechOpen(true)} disabled={busy}>
            Open recorder
          </button>

          <div className="divider" />

          <div className="hint">
            <div className="label">Tip</div>
            <div className="muted">
              If you want speech + document to combine, keep “Use last submission” enabled so they
              attach to the same submission.
            </div>
          </div>
        </div>
      </div>

      {status ? <div className="toast">{status}</div> : null}
      {error ? <div className="toast toastError">{error}</div> : null}

      <SpeechToTextModal
        open={speechOpen}
        onClose={() => setSpeechOpen(false)}
        onUploaded={res => {
          localStorage.setItem(STORAGE_KEYS.lastSubmissionId, res.submissionId)
          cacheSubmission(res.submissionId, res.structuredData)
          setSpeechOpen(false)
          navigate(`/review/${res.submissionId}`)
        }}
        accessToken={accessToken}
        submissionId={activeSubmissionId || undefined}
        templateId={templateId || undefined}
        patientId={patientId || undefined}
      />
    </div>
  )
}

