const express = require('express')
const crypto = require('crypto')
const User = require('../models/User')
const Device = require('../models/Device')
const SessionToken = require('../models/SessionToken')
const jwt = require('jsonwebtoken')

const router = express.Router()

function getEnrollmentCode() {
  return process.env.DEVICE_ENROLLMENT_CODE || process.env.ENROLLMENT_CODE || null
}

router.post('/enroll-device', async (req, res) => {
  try {
    const { idNumber, firstName, lastName, oneTimeCode, publicKey } = req.body || {}

    if (!idNumber || !oneTimeCode || !publicKey) {
      return res.status(400).json({ error: 'idNumber, oneTimeCode and publicKey are required' })
    }

    const expectedCode = getEnrollmentCode()
    if (expectedCode && oneTimeCode !== expectedCode) {
      return res.status(401).json({ error: 'Invalid one-time code' })
    }

    let user = await User.findOne({ idNumber })
    if (!user) {
      user = await User.create({
        idNumber,
        firstName,
        lastName,
        status: 'active'
      })
    } else {
      const update = {}
      if (firstName && user.firstName !== firstName) update.firstName = firstName
      if (lastName && user.lastName !== lastName) update.lastName = lastName
      if (Object.keys(update).length) {
        await User.updateOne({ _id: user._id }, { $set: update })
        Object.assign(user, update)
      }
    }

    const deviceId = crypto.randomUUID()

    const device = await Device.create({
      deviceId,
      user: user._id,
      publicKey,
      status: 'active'
    })

    res.status(201).json({
      deviceId: device.deviceId,
      userId: user._id,
      user: {
        id: user._id,
        idNumber: user.idNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    })
  } catch (err) {
    // eslint-disable-next-line no-console
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

    const device = await Device.findOne({ deviceId }).populate('user')
    if (!device || !device.user) {
      return res.status(404).json({ error: 'Device not found' })
    }

    if (device.status !== 'active' || device.user.status !== 'active') {
      return res.status(403).json({ error: 'Device or user not active' })
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
    // eslint-disable-next-line no-console
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
      return res
        .status(400)
        .json({ error: 'deviceId, challenge and assertion are required' })
    }

    const device = await Device.findOne({ deviceId }).populate('user')
    if (!device || !device.user) {
      return res.status(404).json({ error: 'Device not found' })
    }

    if (device.status !== 'active' || device.user.status !== 'active') {
      return res.status(403).json({ error: 'Device or user not active' })
    }

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

    device.currentChallenge = null
    device.currentChallengeExpiresAt = null
    device.lastSeenAt = new Date()
    await device.save()

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' })
    }

    const scopes = Array.isArray(device.user.allowedScopes)
      ? device.user.allowedScopes
      : []

    const payload = {
      sub: String(device.user._id),
      deviceId: device.deviceId,
      scopes
    }

    const token = jwt.sign(payload, secret, { expiresIn: '15m' })
    const decoded = jwt.decode(token)
    const expiresAt =
      decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000)

    await SessionToken.create({
      user: device.user._id,
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
        id: device.user._id,
        idNumber: device.user.idNumber,
        firstName: device.user.firstName,
        lastName: device.user.lastName,
        role: device.user.role
      },
      deviceId: device.deviceId
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /auth/verify-assertion', err)
    res.status(500).json({ error: 'Failed to verify assertion' })
  }
})

module.exports = router

