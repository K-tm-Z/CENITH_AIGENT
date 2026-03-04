const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const FormSubmission = require('../models/FormSubmission')
const FormTemplate = require('../models/FormTemplate')
const { extractTextFromFile } = require('../services/OcrService')
const { parseToFormFields } = require('../services/DocumentParsingService')
const { transcribeAudio } = require('../services/SpeechToTextService')
const { applyParsedDataToSubmission } = require('../services/FormFillingService')

const router = express.Router()

const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
})

// POST /api/uploads/speech-text
// Accepts transcript text from the browser (Web Speech API) and attaches it to a FormSubmission.
router.post('/speech-text', async (req, res) => {
  try {
    if (!req.user || !req.device) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { submissionId, segmentType, patientId, templateId, transcript } = req.body || {}

    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({ error: 'transcript is required' })
    }

    let submission
    let template = null

    if (submissionId) {
      submission = await FormSubmission.findById(submissionId)
    }

    if (!submission) {
      if (templateId) {
        template = await FormTemplate.findById(templateId).catch(() => null)
      }

      submission = await FormSubmission.create({
        user: req.user._id,
        device: req.device._id,
        patientId: patientId || undefined,
        template: template ? template._id : undefined,
        status: 'processing',
        rawInputSources: []
      })
    }

    submission.rawInputSources.push({
      type: 'speech',
      mimeType: 'text/plain',
      originalName: 'web-speech-transcript.txt',
      segmentType: segmentType || 'unknown',
      transcript: String(transcript).trim()
    })

    const existing = submission.structuredData || {}
    const transcriptField = (existing.fields && existing.fields.transcript) || ''

    submission.structuredData = {
      ...existing,
      fields: {
        ...(existing.fields || {}),
        transcript: [transcriptField, String(transcript).trim()].filter(Boolean).join('\n\n')
      }
    }

    submission.status = 'draft'
    await submission.save()

    res.status(201).json({
      submissionId: submission._id,
      status: submission.status,
      structuredData: submission.structuredData
    })
  } catch (err) {
    console.error('Error in /uploads/speech-text', err)
    res.status(500).json({ error: 'Failed to attach speech transcript' })
  }
})

// POST /api/uploads/documents
// Accepts a PDF/image upload and creates/updates a FormSubmission, then
// runs a best-effort OCR + AI parsing pipeline to populate structuredData.
router.post('/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.user || !req.device) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const file = req.file
    const { templateId, patientId, submissionId } = req.body || {}

    if (!file) {
      return res.status(400).json({ error: 'File is required under field name "file"' })
    }

    let template = null
    if (templateId) {
      template = await FormTemplate.findById(templateId).catch(() => null)
    }

    let submission
    if (submissionId) {
      submission = await FormSubmission.findById(submissionId)
    }

    if (!submission) {
      submission = await FormSubmission.create({
        user: req.user._id,
        device: req.device._id,
        patientId: patientId || undefined,
        template: template ? template._id : undefined,
        status: 'processing',
        rawInputSources: []
      })
    } else {
      submission.status = 'processing'
    }

    submission.rawInputSources.push({
      type: 'file',
      mimeType: file.mimetype,
      originalName: file.originalname,
      path: file.path
    })

    await submission.save()

    // Run OCR + AI parsing in-process for MVP.
    const ocrResult = await extractTextFromFile(file.path, file.mimetype)
    const parsed = await parseToFormFields({
      ocrText: ocrResult.text,
      template
    })

    await applyParsedDataToSubmission(submission, parsed)
    submission.status = 'completed'
    await submission.save()

    res.status(201).json({
      submissionId: submission._id,
      status: submission.status,
      structuredData: submission.structuredData
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /uploads/documents', err)
    res.status(500).json({ error: 'Failed to process uploaded document' })
  }
})

// POST /api/uploads/speech
// Accepts an audio file and attaches a transcript to a FormSubmission.
router.post('/speech', upload.single('audio'), async (req, res) => {
  try {
    if (!req.user || !req.device) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const file = req.file
    const { submissionId, segmentType, patientId, templateId } = req.body || {}

    if (!file) {
      return res.status(400).json({ error: 'Audio file is required under field name "audio"' })
    }

    let submission
    let template = null

    if (submissionId) {
      submission = await FormSubmission.findById(submissionId)
    }

    if (!submission) {
      if (templateId) {
        template = await FormTemplate.findById(templateId).catch(() => null)
      }

      submission = await FormSubmission.create({
        user: req.user._id,
        device: req.device._id,
        patientId: patientId || undefined,
        template: template ? template._id : undefined,
        status: 'processing',
        rawInputSources: []
      })
    }

    const audioBuffer = fs.readFileSync(file.path)
    const sttResult = await transcribeAudio(audioBuffer, {
      mimeType: file.mimetype,
      segmentType
    })

    submission.rawInputSources.push({
      type: 'speech',
      mimeType: file.mimetype,
      originalName: file.originalname,
      path: file.path,
      segmentType: sttResult.segmentType,
      transcript: sttResult.transcript
    })

    const existing = submission.structuredData || {}
    const transcriptField = (existing.fields && existing.fields.transcript) || ''

    submission.structuredData = {
      ...existing,
      fields: {
        ...(existing.fields || {}),
        transcript: [transcriptField, sttResult.transcript].filter(Boolean).join('\n\n')
      }
    }

    submission.status = 'draft'
    await submission.save()

    res.status(201).json({
      submissionId: submission._id,
      status: submission.status,
      structuredData: submission.structuredData
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /uploads/speech', err)
    res.status(500).json({ error: 'Failed to process speech upload' })
  }
})

// POST /api/uploads/submissions/:id/auto-fill
// Re-run AI form filling using all available raw inputs (OCR text and transcripts).
router.post('/submissions/:id/auto-fill', async (req, res) => {
  try {
    if (!req.user || !req.device) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { id } = req.params
    const submission = await FormSubmission.findById(id).populate('template')

    if (!submission) {
      return res.status(404).json({ error: 'FormSubmission not found' })
    }

    const texts = []

    for (const source of submission.rawInputSources || []) {
      if (source.type === 'file' && source.path) {
        const ocrResult = await extractTextFromFile(source.path, source.mimeType)
        if (ocrResult.text) {
          texts.push(ocrResult.text)
        }
      } else if (source.type === 'speech' && source.transcript) {
        texts.push(source.transcript)
      }
    }

    const combinedText = texts.join('\n\n')

    const parsed = await parseToFormFields({
      ocrText: combinedText,
      template: submission.template
    })

    await applyParsedDataToSubmission(submission, parsed)
    submission.status = 'completed'
    await submission.save()

    res.json({
      submissionId: submission._id,
      status: submission.status,
      structuredData: submission.structuredData
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /uploads/submissions/:id/auto-fill', err)
    res.status(500).json({ error: 'Failed to auto-fill submission' })
  }
})

module.exports = router

