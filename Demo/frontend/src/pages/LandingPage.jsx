import { useRef, useState } from "react";

export default function VoiceWelcome({ deviceId, onAuthed }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("");

  async function start() {
    setStatus("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });

    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });

      try {
        setStatus("Transcribing…");
        const form = new FormData();
        form.append("deviceId", deviceId);
        form.append("audio", blob, "login.webm");

        const vb = await fetch("http://localhost:4000/api/auth/voice-begin", {
          method: "POST",
          body: form
        });

        if (!vb.ok) throw new Error(await vb.text());
        const vbJson = await vb.json();

        setStatus(`Heard: "${vbJson.transcript}" (ID: ${vbJson.idNumber})`);

        // Now proceed with your existing auth flow:
        const ch = await fetch("http://localhost:4000/api/auth/get-challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId })
        });
        if (!ch.ok) throw new Error(await ch.text());
        const chJson = await ch.json();

        // Your existing client-side assertion generation goes here:
        // const assertion = sha256(`${chJson.challenge}:${publicKey}`) ...
        // then call verify-assertion to receive JWT.

        onAuthed?.({ challenge: chJson });
      } catch (e) {
        setStatus(`Login failed: ${e.message}`);
      }
    };

    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
  }

  function stop() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Welcome</h2>
      <p>Tap record and say: “Signing in ID EMS-001”</p>

      {!isRecording ? (
        <button onClick={start}>🎙️ Start</button>
      ) : (
        <button onClick={stop}>⏹ Stop</button>
      )}

      <div style={{ marginTop: 12 }}>{status}</div>
    </div>
  );
}