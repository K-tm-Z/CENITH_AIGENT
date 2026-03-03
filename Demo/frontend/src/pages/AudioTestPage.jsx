import React, { useRef, useState } from "react";

export function AudioTestPage() {
  const mrRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const start = async () => {
    setError("");
    setStatus("");
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mrRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        // release mic
        streamRef.current?.getTracks()?.forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        chunksRef.current = [];

        try {
          setBusy(true);
          setStatus("Uploading audio…");

          const form = new FormData();
          form.append("audio", blob, "recording.webm");

          const resp = await fetch("http://localhost:4000/api/audio/test", {
            method: "POST",
            body: form,
          });

          const text = await resp.text();
          if (!resp.ok) throw new Error(text);

          const json = JSON.parse(text);
          setResult(json);
          setStatus("Done.");
        } catch (e) {
          setError(e?.message || "Upload/transcription failed");
          setStatus("");
        } finally {
          setBusy(false);
        }
      };

      mr.start();
      setIsRecording(true);
      setStatus("Recording… speak, then press Stop.");
    } catch (e) {
      setError(e?.message || "Mic permission denied/unavailable.");
    }
  };

  const stop = () => {
    const mr = mrRef.current;
    if (!mr) return;
    if (mr.state !== "inactive") mr.stop();
    setIsRecording(false);
    setStatus("Processing…");
  };

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Voice API test</h1>
        <p className="muted">
          Records in-browser (MediaRecorder), uploads to backend, backend calls GPT-audio-mini and returns JSON.
        </p>
        <div className="divider" />
      </div>

      <div className="card">
        <div className="row">
          {!isRecording ? (
            <button className="secondary" onClick={start} disabled={busy}>
              🎙 Start
            </button>
          ) : (
            <button className="secondary" onClick={stop} disabled={busy}>
              ⏹ Stop
            </button>
          )}
        </div>

        <div className="divider" />

        <div className="field">
          <label>Result</label>
          <div className="codeBlock" style={{ whiteSpace: "pre-wrap" }}>
            {result ? JSON.stringify(result, null, 2) : "(none yet)"}
          </div>
        </div>
      </div>

      {status ? <div className="toast">{status}</div> : null}
      {error ? <div className="toast toastError">{error}</div> : null}
    </div>
  );
}