import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// ─── Валидация токена ────────────────────────────────────────
export function isTokenValid() {
  const token = localStorage.getItem('accessToken')
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

// ─── Приватный маршрут ───────────────────────────────────────
export const PrivateRoute = ({ children }) => {
  const { user } = useAuth()

  if (!user || !isTokenValid()) {
    return <Navigate to="/login" replace />
  }

  return children
}

// ─── Публичный маршрут (редирект если уже залогинен) ────────
export const PublicRoute = ({ children }) => {
  if (isTokenValid()) {
    return <Navigate to="/" replace />
  }
  return children
}

export default PrivateRoute