import React, { createContext, useContext, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../lib/constants.js'

const AuthContext = createContext(null)

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function loadAuthFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.auth)
  const parsed = raw ? safeJsonParse(raw) : null
  return parsed && typeof parsed === 'object' ? parsed : null
}

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(() => loadAuthFromStorage())

  const setAuth = next => {
    setAuthState(next)
    if (next) {
      localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_KEYS.auth)
    }
  }

  const value = useMemo(() => {
    const accessToken = auth?.accessToken || null
    const expiresAt = auth?.expiresAt ? new Date(auth.expiresAt).getTime() : null
    const isExpired = expiresAt ? expiresAt <= Date.now() : false

    return {
      auth: auth && !isExpired ? auth : null,
      setAuth,
      logout: () => setAuth(null),
      accessToken: accessToken && !isExpired ? accessToken : null
    }
  }, [auth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}

