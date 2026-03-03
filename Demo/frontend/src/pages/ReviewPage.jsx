import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { postJson } from '../lib/api.js'
import { STORAGE_KEYS } from '../lib/constants.js'
import { cacheSubmission, loadCachedSubmission } from '../lib/submissionCache.js'
import { EquipmentTable } from '../components/EquipmentTable.jsx'
import { FieldsEditor } from '../components/FieldsEditor.jsx'
import { useAuth } from '../state/AuthContext.jsx'

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ReviewPage() {
  const { submissionId } = useParams()
  const { accessToken } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const initial = useMemo(() => {
    const fromNav = location.state?.structuredData
    if (fromNav) return fromNav
    return loadCachedSubmission(submissionId) || { fields: {}, equipment: [] }
  }, [location.state, submissionId])

  const [structuredData, setStructuredData] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [finalized, setFinalized] = useState(false)

  const fields = structuredData?.fields || {}
  const equipment = structuredData?.equipment || []

  const saveLocal = next => {
    setStructuredData(next)
    cacheSubmission(submissionId, next)
    localStorage.setItem(STORAGE_KEYS.lastSubmissionId, submissionId)
  }

  const rerunAutofill = async () => {
    setBusy(true)
    setError('')
    setStatus('Re-running AI auto-fill…')
    try {
      const res = await postJson(`/api/uploads/submissions/${submissionId}/auto-fill`, {}, { accessToken })
      saveLocal(res.structuredData || {})
      setStatus('Auto-fill completed.')
    } catch (err) {
      setError(err.message || 'Auto-fill failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Review & edit</h1>
        <p className="muted">
          Submission <span className="mono">{submissionId}</span>
        </p>
      </div>

      <div className="row rowWrap">
        <button className="secondary" onClick={() => navigate('/intake')}>
          Back to intake
        </button>
        <button className="secondary" onClick={rerunAutofill} disabled={busy}>
          Re-run AI auto-fill
        </button>
        <button
          onClick={() => {
            downloadJson(`submission-${submissionId}.json`, structuredData || {})
            setFinalized(true)
          }}
          disabled={busy}
        >
          Finalize (download JSON)
        </button>
      </div>

      {finalized ? (
        <div className="banner">
          Finalized locally. (This demo does not yet POST a “submit” to the backend.)
        </div>
      ) : null}

      <div className="grid2 grid2Tall">
        <FieldsEditor
          fields={fields}
          onChange={nextFields => saveLocal({ ...(structuredData || {}), fields: nextFields })}
        />

        <div className="stack">
          <EquipmentTable
            items={equipment}
            onChange={nextEquipment =>
              saveLocal({ ...(structuredData || {}), equipment: nextEquipment })
            }
          />

          <div className="card">
            <div className="row rowSpaceBetween">
              <h2>Raw JSON</h2>
              <button
                className="secondary"
                onClick={() => downloadJson(`structuredData-${submissionId}.json`, structuredData || {})}
              >
                Download
              </button>
            </div>
            <pre className="codeBlock">{JSON.stringify(structuredData || {}, null, 2)}</pre>
          </div>
        </div>
      </div>

      {status ? <div className="toast">{status}</div> : null}
      {error ? <div className="toast toastError">{error}</div> : null}
    </div>
  )
}

