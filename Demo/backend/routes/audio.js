import express from "express";
import multer from "multer";
import { transcribeAudio } from "../services/SpeechToTextService.js";

// You must have these somewhere in your project
// import Device from "../models/Device.js";
// import User from "../models/User.js";
// import { extractIdNumberFromText } from "../lib/extractIdNumberFromText.js";
// import { isUserAllowedOnDevice } from "../lib/isUserAllowedOnDevice.js";

const router = express.Router();

/**
 * Multer config: memory storage + sane limits.
 * - fileSize: cap to prevent huge base64 payloads downstream
 * - fileFilter: accept common audio types
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB; adjust to your max recording length/bitrate
  },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith("audio/") ||
      ["application/octet-stream"].includes(file.mimetype); // some browsers/clients
    cb(ok ? null : new Error(`Unsupported mimetype: ${file.mimetype}`), ok);
  },
});

/**
 * Helper: normalize/trim strings safely.
 */
function cleanStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * POST /api/auth/voice-begin
 * Accepts:
 * - multipart/form-data
 *   - deviceId: string (required)
 *   - text: string (optional)
 *   - audio: file (optional, field name "audio")
 *
 * Behavior:
 * - If text not provided and audio present -> transcribe audio
 * - Extract idNumber from text
 * - Validate device/user and set pendingUser on device
 */
router.post("/voice-begin", upload.single("audio"), async (req, res) => {
  try {
    const deviceId = cleanStr(req.body?.deviceId);
    let text = cleanStr(req.body?.text);

    if (!deviceId) return res.status(400).json({ error: "deviceId is required" });

    // Require either text or audio
    const hasAudio = Boolean(req.file?.buffer?.length);
    if (!text && !hasAudio) {
      return res.status(400).json({ error: "Provide either text or audio" });
    }

    // If audio provided and no text, transcribe
    if (!text && hasAudio) {
      let stt;
      try {
        stt = await transcribeAudio(req.file.buffer, {
          mimeType: req.file.mimetype,
          filename: req.file.originalname,
          segmentType: "login",
        });
      } catch (e) {
        // This is usually a 502/503 style issue (upstream model)
        return res.status(502).json({
          error: "Speech transcription failed",
          detail: String(e?.message || e),
        });
      }

      text = cleanStr(stt?.transcript);
      if (!text) {
        return res.status(400).json({ error: "No speech detected in audio" });
      }
    }

    // Validate device
    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).json({ error: "Device not found" });
    if (device.status !== "active") return res.status(403).json({ error: "Device not active" });

    // Extract ID
    const idNumber = extractIdNumberFromText(text);
    if (!idNumber) {
      return res.status(400).json({
        error: "Could not extract idNumber from speech/text",
        transcript: text, // return transcript for debugging
      });
    }

    // Validate user
    const user = await User.findOne({ idNumber });
    if (!user) return res.status(404).json({ error: "User not found", idNumber });
    if (user.status !== "active") return res.status(403).json({ error: "User not active" });

    // AuthZ: user allowed on device?
    if (!isUserAllowedOnDevice(device, user._id)) {
      return res.status(403).json({ error: "User not allowed on this device" });
    }

    // Set pending login (5 min)
    device.pendingUser = user._id;
    device.pendingUserExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await device.save();

    return res.json({
      ok: true,
      transcript: text,
      idNumber,
      expiresAt: device.pendingUserExpiresAt,
    });
  } catch (err) {
    console.error("Error in POST /auth/voice-begin:", err);
    return res.status(500).json({ error: "Failed to begin voice login" });
  }
});

export default router;