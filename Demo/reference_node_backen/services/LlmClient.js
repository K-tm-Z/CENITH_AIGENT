const DEFAULT_MODEL = process.env.LLM_MODEL || 'gpt-4.1-mini'

/**
 * Thin wrapper around a generic chat completion API.
 *
 * Configure via env:
 * - LLM_API_URL (e.g. https://openrouter.ai/api/v1/chat/completions)
 * - LLM_API_KEY (your secret key; NEVER hardcode it)
 * - LLM_MODEL (provider-specific model id)
 */
async function callLlm({ systemPrompt, userPrompt }) {
  const apiUrl = process.env.LLM_API_URL
  const apiKey = process.env.LLM_API_KEY

  if (!apiUrl || !apiKey) {
    // In dev, fall back to a stubbed response so the backend still works.
    return {
      content:
        'LLM_API_URL or LLM_API_KEY not configured; returning stubbed response for development.'
    }
  }

  const body = {
    model: DEFAULT_MODEL,
    messages: [
      ...(systemPrompt
        ? [
            {
              role: 'system',
              content: systemPrompt
            }
          ]
        : []),
      {
        role: 'user',
        content: userPrompt
      }
    ]
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`LLM API error: ${response.status} ${text}`)
  }

  const json = await response.json()

  const message =
    json.choices && json.choices[0] && json.choices[0].message
      ? json.choices[0].message
      : null

  return {
    content: message && message.content ? message.content : ''
  }
}

module.exports = {
  callLlm
}

