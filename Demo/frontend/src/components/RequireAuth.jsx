import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export function RequireAuth({ children }) {
  const { accessToken } = useAuth()
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/device" replace state={{ from: location.pathname }} />
  }

  return children
}

