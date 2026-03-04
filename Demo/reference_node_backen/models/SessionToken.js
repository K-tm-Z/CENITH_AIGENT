const mongoose = require('mongoose')

const SessionTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    accessToken: { type: String, required: true, index: true, unique: true },
    scopes: [{ type: String }],
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('SessionToken', SessionTokenSchema)

