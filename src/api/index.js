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

// ─── Whitelist ───────────────────────────────────────────────
export const whitelist = {
  list:   (tenantId, search) => get(`/api/whitelist?tenantId=${tenantId}` + (search ? `&search=${encodeURIComponent(search)}` : '')),
  create: (tenantId, data)   => post(`/api/whitelist?tenantId=${tenantId}`, data),
  update: (tenantId, id, data) => put(`/api/whitelist/${id}?tenantId=${tenantId}`, data),
  remove: (tenantId, id)     => del(`/api/whitelist/${id}?tenantId=${tenantId}`),
  toggle: (tenantId, id)     => patch(`/api/whitelist/${id}/toggle?tenantId=${tenantId}`),
  check:  (tenantId, phone)  => get(`/api/whitelist/check?tenantId=${tenantId}&phone=${encodeURIComponent(phone)}`),
}

// ─── Topics ──────────────────────────────────────────────────
export const topics = {
  my:     ()                    => get('/api/topics'),
  list:   (tenantId)            => get(`/api/tenants/${tenantId}/topics`),
  create: (tenantId, data)      => post(`/api/tenants/${tenantId}/topics`, data),
  update: (tenantId, id, data)  => put(`/api/tenants/${tenantId}/topics/${id}`, data),
  remove: (tenantId, id)        => del(`/api/tenants/${tenantId}/topics/${id}`),
}

// ─── IVR / Queue ─────────────────────────────────────────────
export const ivr = {
  get:            (tenantId)        => get(`/api/ivr?tenantId=${tenantId}`),
  updateConfig:   (tenantId, data)  => put('/api/ivr' + (tenantId ? `?tenantId=${tenantId}` : ''), data),
  sync:           (tenantId)        => post('/api/ivr/sync' + (tenantId ? `?tenantId=${tenantId}` : '')),
  uploadGreeting: (tenantId, file)  => {
    const fd = new FormData()
    fd.append('file', file)
    const token = localStorage.getItem('accessToken')
    return fetch(`${BASE_URL}/api/ivr/greeting?tenantId=${tenantId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText) }
      return r.json()
    })
  },
  listOptions:    (tenantId)        => get(`/api/ivr/options?tenantId=${tenantId}`),
  saveOption:     (tenantId, data)  => post('/api/ivr/options' + (tenantId ? `?tenantId=${tenantId}` : ''), data),
  deleteOption:   (tenantId, digit) => del(`/api/ivr/options/${digit}?tenantId=${tenantId}`),
  listMembers:    (tenantId)        => get(`/api/ivr/members?tenantId=${tenantId}`),
  addMember:      (tenantId, username) => post('/api/ivr/members' + (tenantId ? `?tenantId=${tenantId}` : ''), { username }),
  removeMember:   (tenantId, username) => del(`/api/ivr/members/${username}?tenantId=${tenantId}`),
  availableUsers: (tenantId)        => get(`/api/ivr/users?tenantId=${tenantId}`),
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
