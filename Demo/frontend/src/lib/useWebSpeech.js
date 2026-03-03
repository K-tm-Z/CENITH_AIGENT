import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Web Speech API (SpeechRecognition) wrapper.
// Notes:
// - Works best in Chromium-based browsers.
// - Requires HTTPS (or http://localhost).
export function useWebSpeech({ lang = 'en-CA', continuous = true, interimResults = true } = {}) {
  const SpeechRecognition = useMemo(() => {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  }, [])

  const recognitionRef = useRef(null)

  const [supported] = useState(Boolean(SpeechRecognition))
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState('')

  // Initialize once
  useEffect(() => {
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.continuous = continuous
    rec.interimResults = interimResults

    rec.onstart = () => {
      setError('')
      setListening(true)
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
    }

    rec.onerror = e => {
      // Common: "not-allowed" (mic blocked), "no-speech", "audio-capture"
      setError(e?.error || 'speech_error')
      setListening(false)
    }

    rec.onresult = event => {
      let nextFinal = ''
      let nextInterim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const text = res[0]?.transcript || ''
        if (res.isFinal) nextFinal += text
        else nextInterim += text
      }

      if (nextInterim) setInterim(nextInterim.trim())
      if (nextFinal) {
        setFinalText(prev => `${prev}${prev ? ' ' : ''}${nextFinal.trim()}`)
      }
    }

    recognitionRef.current = rec

    return () => {
      try {
        rec.onstart = null
        rec.onend = null
        rec.onerror = null
        rec.onresult = null
        rec.stop()
      } catch {
        // ignore
      }
    }
  }, [SpeechRecognition, lang, continuous, interimResults])

  const start = useCallback(() => {
    setError('')
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
    } catch (e) {
      // Calling start twice throws in some browsers
      setError(e?.message || 'speech_start_failed')
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      // ignore
    }
  }, [])

  const reset = useCallback(() => {
    setInterim('')
    setFinalText('')
    setError('')
  }, [])

  return {
    supported,
    listening,
    interim,
    finalText,
    error,
    start,
    stop,
    reset
  }
}