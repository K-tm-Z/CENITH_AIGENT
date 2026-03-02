const mongoose = require('mongoose')

const RawInputSourceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['file', 'speech'], required: true },
    mimeType: { type: String },
    originalName: { type: String },
    path: { type: String },
    durationSeconds: { type: Number },
    segmentType: { type: String }, // e.g. patient_summary, equipment_used
    transcript: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
)

const FormSubmissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    patientId: { type: String },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate' },
    status: {
      type: String,
      enum: ['draft', 'processing', 'completed', 'error'],
      default: 'draft'
    },
    rawInputSources: [RawInputSourceSchema],
    structuredData: { type: mongoose.Schema.Types.Mixed },
    pdfUrl: { type: String },
    errorMessage: { type: String }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('FormSubmission', FormSubmissionSchema)

