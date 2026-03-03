import { STORAGE_KEYS } from './constants.js'

function base64UrlEncode(bytes) {
  const bin = String.fromCharCode(...bytes)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function getOrCreateDevicePublicKey() {
  const existing = localStorage.getItem(STORAGE_KEYS.devicePublicKey)
  if (existing) return existing

  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const publicKey = `web:${base64UrlEncode(bytes)}`
  localStorage.setItem(STORAGE_KEYS.devicePublicKey, publicKey)
  return publicKey
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Must match backend computeExpectedAssertion(challenge, publicKey)
export async function computeAssertion({ challenge, publicKey }) {
  return sha256Hex(`${challenge}:${publicKey}`)
}

