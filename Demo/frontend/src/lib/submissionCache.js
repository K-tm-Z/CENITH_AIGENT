const PREFIX = 'cenith.submissionCache:'

export function cacheSubmission(submissionId, structuredData) {
  if (!submissionId) return
  try {
    localStorage.setItem(`${PREFIX}${submissionId}`, JSON.stringify(structuredData || {}))
  } catch {
    // ignore
  }
}

export function loadCachedSubmission(submissionId) {
  if (!submissionId) return null
  try {
    const raw = localStorage.getItem(`${PREFIX}${submissionId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

