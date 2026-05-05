import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Защищает маршрут по роли.
 * Если нет доступа — редиректит на /webphone
 */
const RoleRoute = ({ path, children }) => {
  const { can } = useAuth()

  if (!can(path)) {
    return <Navigate to="/webphone" replace />
  }

  return children
}

export default RoleRoute