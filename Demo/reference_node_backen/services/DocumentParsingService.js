const { callLlm } = require('./LlmClient')

/**
 * Interpret OCR text into structured form fields and equipment items.
 *
 * For now this uses a generic LLM call if configured, and otherwise falls back
 * to a very simple heuristic that just drops the text into a single "notes" field.
 */
async function parseToFormFields({ ocrText, template }) {
  const hasLlmConfig = Boolean(process.env.LLM_API_URL && process.env.LLM_API_KEY)

  if (!ocrText) {
    return {
      fields: {},
      equipment: []
    }
  }

  if (!hasLlmConfig) {
    // Simple fallback: no AI configured, just map text into a notes field.
    return {
      fields: {
        notes: ocrText
      },
      equipment: []
    }
  }

  const templateDescription = template
    ? `Template name: ${template.name || ''}\nFields: ${(template.fields || [])
        .map(f => `${f.name} (${f.type || 'string'})`)
        .join(', ')}`
    : 'No explicit template metadata provided.'

  const systemPrompt =
    'You are a medical paperwork assistant. Given OCR text from paramedic paperwork, extract a JSON object with base fields and an equipment array.'

  const userPrompt = [
    'Return ONLY valid JSON.',
    'Shape:',
    '{',
    '  "fields": { "fieldName": "value", ... },',
    '  "equipment": [',
    '    { "name": "string", "quantity": number, "unit": "string", "location": "string" },',
    '    ...',
    '  ]',
    '}',
    '',
    'Template information (may be partial):',
    templateDescription,
    '',
    'OCR text:',
    ocrText
  ].join('\n')

  const { content } = await callLlm({ systemPrompt, userPrompt })

  try {
    const parsed = JSON.parse(content)
    return {
      fields: parsed.fields || {},
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment : []
    }
  } catch (err) {
    // If the LLM did not return parseable JSON, fall back to a simple structure.
    return {
      fields: {
        notes: ocrText
      },
      equipment: []
    }
  }
}

module.exports = {
  parseToFormFields
}

