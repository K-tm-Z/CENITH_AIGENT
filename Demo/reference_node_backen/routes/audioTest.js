const express = require("express")
const multer = require("multer")
const { transcribeAudio } = require("../services/SpeechToTextService.js")
const { webmToWavBuffer } = require("../services/AudioConverter.js")

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("audio/") || file.mimetype === "application/octet-stream";
    cb(ok ? null : new Error(`Unsupported mimetype: ${file.mimetype}`), ok);
  },
});

router.post("/audio/test", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: "Missing audio file (field name: audio)" });
    }
    
    let audioBuffer = req.file.buffer;
    let mimeType = req.file.mimetype;
    let filename = req.file.originalname;

    // Convert webm -> wav if needed
    if (mimeType === "audio/webm" || filename.endsWith(".webm")) {
      audioBuffer = await webmToWavBuffer(audioBuffer);
      mimeType = "audio/wav";
      filename = "recording.wav";
    }

    const stt = await transcribeAudio(audioBuffer, {
      mimeType: mimeType,
      filename: filename,
      segmentType: "test",
    });

    return res.json({
      ok: true,
      transcript: stt.transcript || "",
      segmentType: stt.segmentType || "test",
      meta: {
        mimetype: mimeType,
        filename: filename,
        bytes: audioBuffer.length,
      },
    });
  } catch (err) {
    return res.status(502).json({ error: "Transcription failed", detail: String(err?.message || err) });
  }
});

module.exports = router;