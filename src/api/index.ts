import type {
  LoginResponse,
  TenantWithStats,
  Tariff,
  CreateTenantInput,
  User,
  CDRPage,
  CDRFilter,
  DailyStats,
  AgentStats,
  Ticket,
  TicketComment,
  TicketCategory,
  CreateTicketInput,
  TicketStatus,
  AgentState,
  ApiError,
} from '../types'

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || ''

// ─────────────────────────────────────────
// CORE HTTP CLIENT
// ─────────────────────────────────────────

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

function getToken(): string | null {
  return localStorage.getItem('accessToken')
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let err: ApiError = { code: 'internal_error', message: `HTTP ${res.status}` }
    try {
      err = await res.json()
    } catch {}
    throw new HttpError(res.status, err.code, err.message, err.details)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

const get  = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
  request<T>('GET', path, undefined, params)
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const put  = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
const del  = <T>(path: string) => request<T>('DELETE', path)

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export const auth = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await post<LoginResponse>('/api/auth/login', { username, password })
    setTokens(res.accessToken, res.refreshToken)
    return res
  },

  logout: () => {
    clearTokens()
    window.location.href = '/login'
  },

  register: (data: {
    username: string
    password: string
    firstName: string
    lastName: string
    phone: string
  }) => post<void>('/api/auth/register', data),

  refresh: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) throw new Error('No refresh token')
    const res = await post<LoginResponse>('/api/auth/refresh', { refreshToken })
    setTokens(res.accessToken, res.refreshToken)
    return res
  },
}

// ─────────────────────────────────────────
// TENANTS (COMPANIES)
// ─────────────────────────────────────────

export const tenants = {
  list: () => get<TenantWithStats[]>('/api/companies'),
  create: (input: CreateTenantInput) => post<{ id: number; tenantId: number }>('/api/companies', input),
  update: (tenantId: number, input: CreateTenantInput) => put<void>(`/api/companies/${tenantId}`, input),
  toggleStatus: (tenantId: number) => post<{ status: boolean }>(`/api/companies/${tenantId}/toggle-status`),
  tariffs: () => get<Tariff[]>('/api/companies/tariffs'),

  // Users
  getUsers: (tenantId: number) => get<User[]>(`/api/companies/${tenantId}/users`),
  getUnassigned: () => get<User[]>('/api/companies/users/unassigned'),
  getPending: () => get<User[]>('/api/companies/users/pending'),
  assignUser: (userId: number, tenantId: number) =>
    post<void>('/api/companies/users/assign', { userId, tenantId }),
  unassignUser: (userId: number) =>
    post<void>('/api/companies/users/unassign', { userId }),
  activateUser: (userId: number) =>
    post<void>(`/api/companies/users/${userId}/activate`),
  rejectUser: (userId: number) =>
    del(`/api/companies/users/${userId}`),
  updateUserRole: (userId: number, role: number) =>
    put<void>(`/api/companies/users/${userId}/role`, { role }),
}

// ─────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────

export const staff = {
  list: () => get<User[]>('/api/staff'),
  updateProfile: (id: number, data: Partial<User>) => put<void>(`/api/staff/${id}/profile`, data),
  uploadAvatar: async (id: number, file: File): Promise<{ avatarUrl: string }> => {
    const form = new FormData()
    form.append('avatar', file)
    const token = getToken()
    const res = await fetch(`${BASE_URL}/api/staff/${id}/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) throw new HttpError(res.status, 'upload_error', 'Avatar upload failed')
    return res.json()
  },
  delete: (id: number) => del(`/api/staff/${id}`),
}

// ─────────────────────────────────────────
// MONITOR
// ─────────────────────────────────────────

export const monitor = {
  getAgentsInfo: () => get<{ agents: Pick<User, 'sipNo' | 'firstName' | 'lastName'>[] }>('/api/monitor/agents'),

  // WebSocket URL
  wsUrl: (): string => {
    const token = getToken()
    const base = BASE_URL.replace(/^http/, 'ws')
    return `${base}/api/ws/monitor?token=${token}`
  },
}

// ─────────────────────────────────────────
// CDR (CALL HISTORY)
// ─────────────────────────────────────────

export const cdr = {
  list: (filter: CDRFilter) =>
    get<CDRPage>('/api/reports/calls', filter as Record<string, string | number | boolean | undefined>),
}

// ─────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────

export const analytics = {
  daily: (params: { dateFrom: string; dateTo: string; queue?: string }) =>
    get<DailyStats[]>('/api/analytics/daily', params),
  byAgent: (params: { dateFrom: string; dateTo: string }) =>
    get<AgentStats[]>('/api/analytics/agents', params),
}

// ─────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────

export const tickets = {
  list: (status?: TicketStatus) => get<Ticket[]>('/api/tickets', { status }),
  getById: (id: number) => get<Ticket>(`/api/tickets/${id}`),
  create: (input: CreateTicketInput) => post<Ticket>('/api/tickets', input),
  updateStatus: (id: number, status: TicketStatus) =>
    put<void>(`/api/tickets/${id}/status`, { status }),
  getComments: (id: number) => get<TicketComment[]>(`/api/tickets/${id}/comments`),
  addComment: (id: number, body: string) =>
    post<TicketComment>(`/api/tickets/${id}/comments`, { body }),
  categories: {
    list: () => get<TicketCategory[]>('/api/tickets/categories'),
    create: (name: string, color: string) =>
      post<TicketCategory>('/api/tickets/categories', { name, color }),
  },
}

// ─────────────────────────────────────────
// AMI ACTIONS
// ─────────────────────────────────────────

export const amiActions = {
  pauseAgent: (queue: string, agent: string, paused: boolean) =>
    post<void>('/api/ami/pause', { queue, agent, paused }),
  transferCall: (channel: string, extension: string) =>
    post<void>('/api/ami/transfer', { channel, extension }),
  hangup: (channel: string) =>
    post<void>('/api/ami/hangup', { channel }),
}

// Re-export error type
export { HttpError }
