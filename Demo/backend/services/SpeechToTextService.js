const process = require('node:process')

function guessAudioFormat(mimeType = "", filename = "") {
  if (mimeType.includes("webm") || filename.endsWith(".webm")) return "webm";
  if (mimeType.includes("wav") || filename.endsWith(".wav")) return "wav";
  if (mimeType.includes("mpeg") || filename.endsWith(".mp3")) return "mp3";
  if (mimeType.includes("ogg") || filename.endsWith(".ogg")) return "ogg";
  return "webm";
}

async function transcribeAudio(buffer, { mimeType, filename, segmentType } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const url = process.env.OPENROUTER_URL || "https://openrouter.ai/api/v1/chat/completions";
  const model = process.env.OPENAI_STT_MODEL || "openai/gpt-audio-mini";

  if (!buffer || !buffer.length) {
    return { transcript: "", segmentType: segmentType || "unknown" };
  }

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const base64Audio = Buffer.from(buffer).toString("base64");
  const format = guessAudioFormat(mimeType, filename);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the audio. Return JSON only as {\"transcript\":\"...\"}"
            },
            {
              type: "input_audio",
              input_audio: {
                data: base64Audio,
                format
              }
            }
          ]
        }
      ]
    })
  });

  const raw = await resp.text();
  if (!resp.ok) {
    throw new Error(`OpenRouter error ${resp.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;

  let transcript = "";

  if (typeof content === "string") {
    try {
      transcript = JSON.parse(content)?.transcript || "";
    } catch {
      transcript = content; // fallback if model didn't obey JSON-only
    }
  }

  return { transcript, segmentType: segmentType || "unknown" };
}

module.exports = { transcribeAudio };