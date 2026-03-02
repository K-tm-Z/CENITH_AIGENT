const fs = require('fs')
const path = require('path')

/**
 * Minimal OCR stub for MVP.
 *
 * In production you would:
 * - send PDFs/images to an OCR provider (e.g. Vision/OCR API)
 * - normalize their response into { text, pages: [...] }.
 */
async function extractTextFromFile(filePath, mimeType) {
  const absolutePath = path.resolve(filePath)

  // Ensure the file exists; if not, just return an empty result.
  if (!fs.existsSync(absolutePath)) {
    return {
      text: '',
      pages: []
    }
  }

  // For now we do not implement real OCR; just return a placeholder.
  const placeholderDescription = `OCR not configured. File stored at ${absolutePath} (${mimeType ||
    'unknown mime type'}).`

  return {
    text: placeholderDescription,
    pages: []
  }
}

module.exports = {
  extractTextFromFile
}

