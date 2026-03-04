const mongoose = require('mongoose')

const EquipmentItemSchema = new mongoose.Schema(
  {
    formSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FormSubmission',
      required: true
    },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String },
    location: { type: String },
    codes: [{ type: String }],
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('EquipmentItem', EquipmentItemSchema)

