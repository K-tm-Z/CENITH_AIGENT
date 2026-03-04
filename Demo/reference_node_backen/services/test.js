import fs from "node:fs";
import process from "node:process";
import "dotenv/config";

// Node 18+ has global fetch; otherwise: npm i node-fetch and import it
// import fetch from "node-fetch";

const audioBuffer = fs.readFileSync(new URL("./test.wav", import.meta.url));
const base64Audio = audioBuffer.toString("base64");

const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer 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`,
    "Content-Type": "application/json",
    // Optional but often recommended by OpenRouter:
    // "HTTP-Referer": "http://localhost:5173",
    // "X-OpenRouter-Title": "Local audio test",
  },
  body: JSON.stringify({
    model: "openai/gpt-audio-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the ID from the audio. Return JSON only." },
          {
            type: "input_audio",
            input_audio: { data: base64Audio, format: "wav" },
          },
        ],
      },
    ],
  }),
});

const text = await resp.text();
if (!resp.ok) {
  console.error("HTTP", resp.status, resp.statusText);
  console.error(text);
  process.exit(1);
}

const data = JSON.parse(text);
console.log("OpenRouter response:", JSON.stringify(data, null, 2));

// Convenience: print the assistant text if present
const assistantText = data?.choices?.[0]?.message?.content;
if (assistantText) console.log("\nAssistant content:\n", assistantText);