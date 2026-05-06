/**
 * CallCentrix API client
 */

const BASE_URL = import.meta.env.VITE_API_URL || window.location.origin

function getToken() {
  return localStorage.getItem('accessToken')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('accessToken')
    window.location.hash = '#/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

const get   = (path)       => request('GET',    path)
const post  = (path, body) => request('POST',   path, body)
const put   = (path, body) => request('PUT',    path, body)
const del   = (path)       => request('DELETE', path)
const patch = (path, body) => request('PATCH',  path, body)

// ─── Auth ────────────────────────────────────────────────────
export const auth = {
  login:  (username, password) => post('/api/auth/login', { username, password }),
  me:     ()                   => get('/api/auth/me'),
  logout: ()                   => post('/api/auth/logout'),
}

// ─── Tenants ─────────────────────────────────────────────────
export const tenants = {
  list:         ()         => get('/api/tenants'),
  get:          (id)       => get(`/api/tenants/${id}`),
  create:       (data)     => post('/api/tenants', data),
  update:       (id, data) => put(`/api/tenants/${id}`, data),
  remove:       (id)       => del(`/api/tenants/${id}`),
  activate:     (id)       => patch(`/api/tenants/${id}/activate`),
  deactivate:   (id)       => patch(`/api/tenants/${id}/deactivate`),
  assignUser:   (id, uid)  => post(`/api/tenants/${id}/users`, { userId: uid }),
  unassignUser: (id, uid)  => del(`/api/tenants/${id}/users/${uid}`),
}

// ─── Users ───────────────────────────────────────────────────
export const users = {
  list:       (params)     => get('/api/users' + toQuery(params)),
  get:        (id)         => get(`/api/users/${id}`),
  create:     (data)       => post('/api/users', data),
  update:     (id, data)   => put(`/api/users/${id}`, data),
  remove:     (id)         => del(`/api/users/${id}`),
  activate:   (id)         => patch(`/api/users/${id}/activate`),
  deactivate: (id)         => patch(`/api/users/${id}/deactivate`),
  resetPwd:   (id, pwd)    => patch(`/api/users/${id}/password`, { password: pwd }),
}

// ─── Tickets ─────────────────────────────────────────────────
export const tickets = {
  list:    (params)    => get('/api/tickets' + toQuery(params)),
  get:     (id)        => get(`/api/tickets/${id}`),
  create:  (data)      => post('/api/tickets', data),
  update:  (id, data)  => put(`/api/tickets/${id}`, data),
  remove:  (id)        => del(`/api/tickets/${id}`),
  comment: (id, text)  => post(`/api/tickets/${id}/comments`, { text }),
  comments:(id)        => get(`/api/tickets/${id}/comments`),
}

// ─── CDR ─────────────────────────────────────────────────────
export const cdr = {
  list:  (params) => get('/api/cdr' + toQuery(params)),
  get:   (id)     => get(`/api/cdr/${id}`),
  audio: (id)     => `${BASE_URL}/api/cdr/${id}/audio?token=${getToken()}`,
}

// ─── Monitor ─────────────────────────────────────────────────
export const monitor = {
  snapshot:   () => get('/api/monitor/snapshot'),
  agentsInfo: () => get('/api/agents/info'),
  pause:      (agentId) => post('/api/actions/pause',   { agentId }),
  unpause:    (agentId) => post('/api/actions/unpause', { agentId }),
  hangup:     (channel) => post('/api/actions/hangup',  { channel }),
  wsUrl:      () => {
    const base = (import.meta.env.VITE_API_URL || window.location.origin)
      .replace(/^http/, 'ws')
    return `${base}/ws/monitor?token=${getToken()}`
  },
}

// ─── Helpers ─────────────────────────────────────────────────
function toQuery(params) {
  if (!params) return ''
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString()
  return q ? `?${q}` : ''
}
