/**
 * Централизованная конфигурация API
 * Адрес бэкенда берётся из localStorage (ключ 'backendUrl')
 * Устанавливается на странице логина
 */

const STORAGE_KEY = 'backendUrl'
const DEFAULT_URL = 'http://localhost:8080'

export function getBackendUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL
}

export function setBackendUrl(url) {
  // Убираем trailing slash
  const clean = url.replace(/\/+$/, '')
  localStorage.setItem(STORAGE_KEY, clean)
}

export const API_CONFIG = {
  get BASE_URL() { return getBackendUrl() },
  get WS_BASE_URL() { return getBackendUrl().replace(/^http/, 'ws') },

  ENDPOINTS: {
    LOGIN:          '/api/auth/login',
    ME:             '/api/auth/me',
    AGENTS_INFO:    '/api/agents/info',
    ACTIONS_PAUSE:  '/api/actions/pause',
    ACTIONS_HANGUP: '/api/actions/hangup',
    WS_MONITOR:     '/ws/monitor',
  },

  TIMEOUTS: {
    HTTP_REQUEST:         10000,
    WS_RECONNECT:          3000,
    TOKEN_CHECK_INTERVAL: 60000,
  },
}

export function getApiUrl(endpoint) {
  return `${getBackendUrl()}${endpoint}`
}

export function getWsUrl(endpoint) {
  return `${getBackendUrl().replace(/^http/, 'ws')}${endpoint}`
}

export function getAuthToken() {
  return localStorage.getItem('accessToken')
}

export function getAuthHeaders() {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export default API_CONFIG