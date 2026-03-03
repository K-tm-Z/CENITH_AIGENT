const mongoose = require('mongoose')

const FieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String },
    type: { type: String, default: 'string' }, // string, number, date, enum, etc.
    required: { type: Boolean, default: false },
    options: [{ type: String }], // for enum-like fields
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
)

const FormTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String }, // e.g. incident, transfer, equipment
    version: { type: String, default: '1.0' },
    fields: [FieldSchema],
    mappingMetadata: { type: mongoose.Schema.Types.Mixed }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('FormTemplate', FormTemplateSchema)

