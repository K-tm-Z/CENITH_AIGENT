const mongoose = require('mongoose')

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publicKey: { type: String, required: true },
    mdmEnrollmentInfo: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active'
    },
    lastSeenAt: { type: Date },
    currentChallenge: { type: String },
    currentChallengeExpiresAt: { type: Date }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Device', DeviceSchema)

