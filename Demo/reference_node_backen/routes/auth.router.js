const express = require('express')
const crypto = require('crypto')
const User = require('../models/User')
const Device = require('../models/Device')
const SessionToken = require('../models/SessionToken')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const router = express.Router()
const multer = require('multer')
const { transcribeAudio } = require('../services/SpeechToTextService')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB for short login utterance
})

function getEnrollmentCode() {
  return process.env.DEVICE_ENROLLMENT_CODE || process.env.ENROLLMENT_CODE || null
}

function extractIdNumberFromText(text) {
  if (!text) return null

  // Examples it should catch:
  // "Signing in ID EMS-001"
  // "ID: EMS-001"
  // "My id is EMS-001"
  const m =
    text.match(/\bID\b\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9-]{1,40})\b/i) ||
    text.match(/\b(my\s+id\s+is)\s+([A-Za-z0-9][A-Za-z0-9-]{1,40})\b/i)

  if (!m) return null

  // If regex 2 matched, group 2 is the ID; else group 1
  const id = (m[2] || m[1] || '').trim()
  return id || null
}

function isUserAllowedOnDevice(device, userId) {
  if (!device || !userId) return false

  // Personal device: ownerUser must match
  if (device.mode === 'personal') {
    return device.ownerUser && String(device.ownerUser) === String(userId)
  }

  // Shared device: must be on allowedUsers list
  const allowed = Array.isArray(device.allowedUsers) ? device.allowedUsers : []
  return allowed.some(u => String(u) === String(userId))
}

router.post('/enroll-device', async (req, res) => {
  try {
    const { oneTimeCode, publicKey, mode, ownerIdNumber, allowedIdNumbers } = req.body || {}

    if (!oneTimeCode || !publicKey) {
      return res.status(400).json({ error: 'oneTimeCode and publicKey are required' })
    }

    const expectedCode = getEnrollmentCode()
    if (expectedCode && oneTimeCode !== expectedCode) {
      return res.status(401).json({ error: 'Invalid one-time code' })
    }

    const deviceMode = mode === 'personal' ? 'personal' : 'shared'
    let ownerUser = null
    let allowedUsers = []

    if (deviceMode === 'personal') {
      if (!ownerIdNumber) return res.status(400).json({ error: 'ownerIdNumber is required for personal mode' })
      ownerUser = await User.findOne({ idNumber: ownerIdNumber })
      if (!ownerUser) return res.status(404).json({ error: 'Owner user not found' })
      if (ownerUser.status !== 'active') return res.status(403).json({ error: 'Owner user not active' })
      allowedUsers = [ownerUser._id]
    } else {
      // shared: whitelist by id numbers
      const ids = Array.isArray(allowedIdNumbers) ? allowedIdNumbers : []
      if (!ids.length) {
        return res.status(400).json({ error: 'allowedIdNumbers is required for shared mode' })
      }
      const users = await User.find({ idNumber: { $in: ids } })
      allowedUsers = users.map(u => u._id)
      if (!allowedUsers.length) return res.status(400).json({ error: 'No matching users for allowedIdNumbers' })
    }

    const deviceId = crypto.randomUUID()

    const device = await Device.create({
      deviceId,
      mode: deviceMode,
      ownerUser: ownerUser ? ownerUser._id : null,
      allowedUsers,
      publicKey,
      status: 'active'
    })

    res.status(201).json({
      deviceId: device.deviceId,
      mode: device.mode,
      allowedUserCount: device.allowedUsers.length
    })
  } catch (err) {
    console.error('Error in /auth/enroll-device', err)
    res.status(500).json({ error: 'Failed to enroll device' })
  }
})

router.post('/get-challenge', async (req, res) => {
  try {
    const { deviceId } = req.body || {}

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' })
    }

    const device = await Device.findOne({ deviceId }).populate('pendingUser')
    if (!device) return res.status(404).json({ error: 'Device not found' })

    if (device.status !== 'active') return res.status(403).json({ error: 'Device not active' })

    // NEW: require a pending user from voice-begin
    if (
      !device.pendingUser ||
      !device.pendingUserExpiresAt ||
      device.pendingUserExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(401).json({ error: 'No pending login user (run voice-begin first)' })
    }

    if (device.pendingUser.status !== 'active') {
      return res.status(403).json({ error: 'Pending user not active' })
    }

    const challenge = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    device.currentChallenge = challenge
    device.currentChallengeExpiresAt = expiresAt
    await device.save()

    res.json({
      deviceId: device.deviceId,
      challenge,
      expiresAt
    })
  } catch (err) {
    console.error('Error in /auth/get-challenge', err)
    res.status(500).json({ error: 'Failed to create challenge' })
  }
})

function computeExpectedAssertion(challenge, publicKey) {
  return crypto.createHash('sha256').update(`${challenge}:${publicKey}`).digest('hex')
}

router.post('/verify-assertion', async (req, res) => {
  try {
    const { deviceId, challenge, assertion } = req.body || {}

    if (!deviceId || !challenge || !assertion) {
      return res.status(400).json({ error: 'deviceId, challenge and assertion are required' })
    }

    const device = await Device.findOne({ deviceId }).populate('pendingUser')
    if (!device) return res.status(404).json({ error: 'Device not found' })

    if (device.status !== 'active') return res.status(403).json({ error: 'Device not active' })

    // NEW: require pending user still valid
    if (
      !device.pendingUser ||
      !device.pendingUserExpiresAt ||
      device.pendingUserExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(401).json({ error: 'Pending login expired (run voice-begin again)' })
    }

    if (device.pendingUser.status !== 'active') {
      return res.status(403).json({ error: 'Pending user not active' })
    }

    // Existing challenge check
    if (
      !device.currentChallenge ||
      device.currentChallenge !== challenge ||
      !device.currentChallengeExpiresAt ||
      device.currentChallengeExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(401).json({ error: 'Challenge is invalid or expired' })
    }

    const expected = computeExpectedAssertion(challenge, device.publicKey)
    if (expected !== assertion) {
      return res.status(401).json({ error: 'Invalid assertion' })
    }

    // Clear challenge + pending user after successful login
    const loginUser = device.pendingUser
    device.currentChallenge = null
    device.currentChallengeExpiresAt = null
    device.pendingUser = null
    device.pendingUserExpiresAt = null
    device.lastSeenAt = new Date()
    await device.save()

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' })
    }

    const scopes = Array.isArray(loginUser.allowedScopes) ? loginUser.allowedScopes : []

    const payload = {
      sub: String(loginUser._id),
      deviceId: device.deviceId,
      scopes
    }

    const token = jwt.sign(payload, secret, { expiresIn: '15m' })
    const decoded = jwt.decode(token)
    const expiresAt =
      decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000)

    await SessionToken.create({
      user: loginUser._id,
      device: device._id,
      accessToken: token,
      scopes,
      expiresAt,
      revoked: false
    })

    res.json({
      accessToken: token,
      expiresAt,
      user: {
        id: loginUser._id,
        idNumber: loginUser.idNumber,
        firstName: loginUser.firstName,
        lastName: loginUser.lastName,
        role: loginUser.role
      },
      deviceId: device.deviceId
    })
  } catch (err) {
    console.error('Error in /auth/verify-assertion', err)
    res.status(500).json({ error: 'Failed to verify assertion' })
  }
})

/**
 * POST /api/auth/voice-begin
 * Body: { deviceId: string, text: string }
 *
 * In production, replace "text" with audio upload + STT.
 * This binds the spoken idNumber to the device for a short window.
 */
router.post('/voice-begin', upload.single('audio'), async (req, res) => {
  try {
    const deviceId = req.body?.deviceId
    let text = req.body?.text

    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    // If audio provided, transcribe it
    if (!text && req.file?.buffer) {
      const stt = await transcribeAudio(req.file.buffer, {
        mimeType: req.file.mimetype,
        segmentType: 'login'
      })
      text = stt.transcript
    }

    if (!text) return res.status(400).json({ error: 'Provide text or audio' })

    const device = await Device.findOne({ deviceId })
    if (!device) return res.status(404).json({ error: 'Device not found' })
    if (device.status !== 'active') return res.status(403).json({ error: 'Device not active' })

    const idNumber = extractIdNumberFromText(text)
    if (!idNumber) return res.status(400).json({ error: 'Could not extract idNumber from speech/text' })

    const user = await User.findOne({ idNumber })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.status !== 'active') return res.status(403).json({ error: 'User not active' })

    if (!isUserAllowedOnDevice(device, user._id)) {
      return res.status(403).json({ error: 'User not allowed on this device' })
    }

    device.pendingUser = user._id
    device.pendingUserExpiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await device.save()

    res.json({
      ok: true,
      transcript: text,
      idNumber,
      expiresAt: device.pendingUserExpiresAt
    })
  } catch (err) {
    console.error('Error in /auth/voice-begin', err)
    res.status(500).json({ error: 'Failed to begin voice login' })
  }
})

module.exports = router

