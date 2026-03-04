const jwt = require('jsonwebtoken')
const SessionToken = require('../models/SessionToken')
const User = require('../models/User')
const Device = require('../models/Device')

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const [, token] = authHeader.split(' ')

    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization header' })
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' })
    }

    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const session = await SessionToken.findOne({
      accessToken: token,
      revoked: false,
      expiresAt: { $gt: new Date() }
    })

    if (!session) {
      return res.status(401).json({ error: 'Session not found or expired' })
    }

    const user = await User.findById(session.user)
    const device = await Device.findById(session.device)

    if (!user || !device) {
      return res.status(401).json({ error: 'Associated user or device not found' })
    }

    if (user.status !== 'active' || device.status !== 'active') {
      return res.status(403).json({ error: 'User or device not active' })
    }

    req.user = user
    req.device = device
    req.auth = {
      token,
      scopes: payload.scopes || [],
      sessionId: session._id
    }

    next()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Auth middleware error', err)
    res.status(500).json({ error: 'Internal auth error' })
  }
}

module.exports = {
  authMiddleware
}

