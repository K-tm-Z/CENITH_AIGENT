const mongoose = require('mongoose')

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },

    // shared vs personal
    mode: { type: String, enum: ['shared', 'personal'], default: 'shared' },
    ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // “voice-begin” binds a user for a short login window
    pendingUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pendingUserExpiresAt: { type: Date, default: null },

    mdmEnrollmentInfo: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'inactive', 'revoked'], default: 'active' },

    lastSeenAt: { type: Date },
    currentChallenge: { type: String },
    currentChallengeExpiresAt: { type: Date }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Device', DeviceSchema)

