const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    idNumber: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    dob: { type: Date },
    role: { type: String },
    organizationId: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    allowedScopes: [{ type: String }]
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('User', UserSchema)

