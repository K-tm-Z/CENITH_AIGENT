import { API_BASE_URL } from './constants.js'

async function readJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function apiFetch(path, { accessToken, ...init } = {}) {
  const headers = new Headers(init.headers || {})
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  })

  if (!res.ok) {
    const body = await readJsonSafe(res)
    const message = body?.error || body?.message || `${res.status} ${res.statusText}`
    const err = new Error(message)
    err.status = res.status
    err.body = body
    throw err
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res.text()
}

export async function postJson(path, body, { accessToken } = {}) {
  return apiFetch(path, {
    method: 'POST',
    accessToken,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
}

export async function postForm(path, formData, { accessToken } = {}) {
  return apiFetch(path, {
    method: 'POST',
    accessToken,
    body: formData
  })
}

