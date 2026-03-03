export const STORAGE_KEYS = {
  auth: 'cenith.auth',
  deviceId: 'cenith.deviceId',
  devicePublicKey: 'cenith.devicePublicKey',
  lastSubmissionId: 'cenith.lastSubmissionId'
}

export const API_BASE_URL =
  (import.meta?.env && import.meta.env.VITE_API_URL) || 'http://localhost:4000'

