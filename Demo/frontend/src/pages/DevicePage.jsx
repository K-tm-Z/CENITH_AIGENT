import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { postJson } from '../lib/api.js'
import { STORAGE_KEYS } from '../lib/constants.js'
import { computeAssertion, getOrCreateDevicePublicKey } from '../lib/deviceCrypto.js'
import { useAuth } from '../state/AuthContext.jsx'
import { useWebSpeech } from '../lib/useWebSpeech.js'

async function loginWithDevice({ deviceId }) {
  const challengeRes = await postJson('/api/auth/get-challenge', { deviceId })
  const publicKey = getOrCreateDevicePublicKey()
  const assertion = await computeAssertion({ challenge: challengeRes.challenge, publicKey })
  return postJson('/api/auth/verify-assertion', {
    deviceId,
    challenge: challengeRes.challenge,
    assertion
  })
}

async function voiceBegin({ deviceId, audioBlob }) {
  const form = new FormData()
  form.append('deviceId', deviceId)
  form.append('audio', audioBlob, 'login.webm')

  const res = await fetch('http://localhost:4000/api/auth/voice-begin', {
    method: 'POST',
    body: form
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function DevicePage() {
  const { setAuth, accessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isRecording, setIsRecording] = useState(false)
  const speech = useWebSpeech({ lang: 'en-CA', continuous: true, interimResults: true })

  const startRecording = async () => {
  setError('')
  setStatus('')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
  const chunks = []

  mr.ondataavailable = e => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop())
    const blob = new Blob(chunks, { type: 'audio/webm' })

    try {
      setBusy(true)
      setStatus('Transcribing sign-in…')

      // Step 1: voice identify
      const vb = await voiceBegin({ deviceId, audioBlob: blob })
      setStatus(`Heard: "${vb.transcript}" (ID: ${vb.idNumber})`)

      // Step 2: existing device login (challenge/assertion)
      await doLogin(deviceId)
    } catch (e) {
      setError(e.message || 'Voice sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  mr.start()
  setIsRecording(true)

  // Save recorder on window or ref so Stop can access it
  window.__mr = mr
}

const doVoiceSignIn = async () => {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      if (!deviceId) {
        setError('Device ID is required.')
        return
      }
      if (!speech.finalText.trim()) {
        setError('No transcript captured yet. Press Start, speak your ID, then Stop.')
        return
      }

      setStatus('Submitting voice transcript…')
      await postJson('/api/auth/voice-begin', {
        deviceId,
        text: speech.finalText // backend extracts ID from this text :contentReference[oaicite:2]{index=2}
      })

      // Now pending user exists, challenge will work :contentReference[oaicite:3]{index=3}
      await doLogin(deviceId)
    } catch (err) {
      setError(err.message || 'Voice sign-in failed')
    } finally {
      setBusy(false)
    }
  }

const stopRecording = () => {
  if (window.__mr && isRecording) {
    window.__mr.stop()
    setIsRecording(false)
  }
}
  const existingDeviceId = useMemo(
    () => localStorage.getItem(STORAGE_KEYS.deviceId) || '',
    [],
  )

  const [deviceId, setDeviceId] = useState(existingDeviceId)
  const [idNumber, setIdNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [oneTimeCode, setOneTimeCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const redirectTo = location.state?.from || '/intake'

  const doLogin = async nextDeviceId => {
    setError('')
    setStatus('Requesting challenge…')
    const res = await loginWithDevice({ deviceId: nextDeviceId })
    setAuth({
      accessToken: res.accessToken,
      expiresAt: res.expiresAt,
      user: res.user,
      deviceId: res.deviceId
    })
    localStorage.setItem(STORAGE_KEYS.deviceId, res.deviceId)
    setStatus('Signed in.')
    navigate(redirectTo, { replace: true })
  }

  const handleEnroll = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const publicKey = getOrCreateDevicePublicKey()
      setStatus('Enrolling device…')
      const res = await postJson('/api/auth/enroll-device', {
        idNumber,
        firstName,
        lastName,
        oneTimeCode,
        publicKey
      })
      localStorage.setItem(STORAGE_KEYS.deviceId, res.deviceId)
      setDeviceId(res.deviceId)
      await doLogin(res.deviceId)
    } catch (err) {
      setError(err.message || 'Failed to enroll')
    } finally {
      setBusy(false)
    }
  }

  const handleSignIn = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await doLogin(deviceId)
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Device sign-in</h1>
        <p className="muted">
          This demo simulates an MDM-managed device key by storing a device “public key” in your
          browser storage.
        </p>
        <div className="divider" />

      <h3>Voice sign-in</h3>
      <p className="muted">Say: “Signing in ID EMS-001”</p>

      {!isRecording ? (
        <button className="secondary" onClick={startRecording} disabled={busy || !deviceId}>
          🎙 Start recording
        </button>
      ) : (
        <button className="secondary" onClick={stopRecording} disabled={busy}>
          ⏹ Stop
        </button>
      )}
      </div>

      {accessToken ? (
        <div className="card">
          <div className="row">
            <div>
              <div className="label">Status</div>
              <div className="value">Already signed in.</div>
            </div>
            <button onClick={() => navigate('/intake')}>Go to intake</button>
          </div>
        </div>
      ) : null}

      <div className="grid2">
        <form className="card" onSubmit={handleEnroll}>
          <h2>Enroll device</h2>
          <div className="field">
            <label>ID number</label>
            <input value={idNumber} onChange={e => setIdNumber(e.target.value)} required />
          </div>
          <div className="field">
            <label>First name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="field">
            <label>Last name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div className="field">
            <label>One-time code</label>
            <input
              value={oneTimeCode}
              onChange={e => setOneTimeCode(e.target.value)}
              placeholder="(from admin)"
              required
            />
          </div>
          <button disabled={busy}>Enroll + sign in</button>
        </form>

        <form className="card" onSubmit={handleSignIn}>
          <h2>Sign in (existing device)</h2>
          <div className="field">
            <label>Device ID</label>
            <input
              value={deviceId}
              onChange={e => setDeviceId(e.target.value)}
              placeholder="deviceId"
              required
            />
          </div>

          <button disabled={busy}>Sign in</button>

          <div className="divider" />

          <h3>Voice sign-in</h3>

          {!speech.supported ? (
            <div className="toast toastError">
              SpeechRecognition not supported in this browser. Try Chrome/Edge.
            </div>
          ) : (
            <>
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
                <div className="muted">
                  Say: “My ID is EMS-001” or “ID: EMS-001”
                </div>
              </div>

              {speech.error ? <div className="toast toastError">{speech.error}</div> : null}

              <button type="button" onClick={doVoiceSignIn} disabled={busy}>
                Voice sign in
              </button>
            </>
          )}

          <div className="divider" />

          <div className="hint">
            <div className="label">Stored device key</div>
            <div className="mono">{getOrCreateDevicePublicKey()}</div>
          </div>
        </form>
      </div>

      {status ? <div className="toast">{status}</div> : null}
      {error ? <div className="toast toastError">{error}</div> : null}
    </div>
  )
}

