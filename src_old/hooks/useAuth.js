import { useMemo } from 'react'
import { hasAccess, getRoleName, USER_TYPE, ROLE } from '../config/roles'

/**
 * Декодирует JWT токен без верификации (только payload)
 */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

/**
 * Хук для получения данных текущего пользователя и проверки доступа
 */
export function useAuth() {
  const token = localStorage.getItem('accessToken')

  const user = useMemo(() => {
    if (!token) return null
    const payload = parseJwt(token)
    if (!payload) return null
    return {
      id:       payload.sub,
      username: payload.username,
      userType: payload.user_type ?? payload.userType ?? USER_TYPE.AGENT,
      role:     payload.role !== undefined ? payload.role : ROLE.OPERATOR,
      tenantId: payload.tenant_id ?? payload.tenantId,
    }
  }, [token])

  const can = (path) => {
    if (!user) return false
    return hasAccess(path, user.userType, user.role)
  }

  const roleName = (t) => {
    if (!user) return ''
    return getRoleName(user.userType, user.role, t)
  }

  return { user, can, roleName }
}