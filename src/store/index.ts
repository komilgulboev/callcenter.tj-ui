import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { jwtDecode } from 'jwt-decode'
import type { AuthClaims, MonitorSnapshot, AgentState, LiveCall, QueueStats } from '../types'

// ─────────────────────────────────────────
// AUTH STORE
// ─────────────────────────────────────────

interface AuthState {
  token: string | null
  claims: AuthClaims | null
  setToken: (token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
  isSuperAdmin: () => boolean
  isSupervisor: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: localStorage.getItem('accessToken'),
      claims: (() => {
        const t = localStorage.getItem('accessToken')
        if (!t) return null
        try { return jwtDecode<AuthClaims>(t) } catch { return null }
      })(),

      setToken: (token: string) => {
        localStorage.setItem('accessToken', token)
        try {
          const claims = jwtDecode<AuthClaims>(token)
          set({ token, claims })
        } catch {
          set({ token, claims: null })
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ token: null, claims: null })
      },

      isAuthenticated: () => {
        const { claims } = get()
        if (!claims) return false
        return claims.exp * 1000 > Date.now()
      },

      isSuperAdmin: () => get().claims?.userType === 0,
      isSupervisor: () => {
        const c = get().claims
        return c?.userType === 3 && c?.role === 1
      },
    }),
    { name: 'callcentrix-auth', partialize: (s) => ({ token: s.token }) },
  ),
)

// ─────────────────────────────────────────
// MONITOR STORE
// ─────────────────────────────────────────

interface MonitorState {
  agents: Record<string, AgentState>
  calls: Record<string, LiveCall>
  queues: Record<string, QueueStats>
  connected: boolean
  lastUpdate: number

  // Метаданные агентов (имена из БД)
  agentNames: Record<string, string> // sipNo → displayName

  applySnapshot: (snap: MonitorSnapshot) => void
  setConnected: (v: boolean) => void
  setAgentNames: (names: Record<string, string>) => void

  // Computed selectors
  onlineAgents: () => AgentState[]
  activeCallsCount: () => number
  waitingCount: () => number
}

export const useMonitorStore = create<MonitorState>()((set, get) => ({
  agents: {},
  calls: {},
  queues: {},
  connected: false,
  lastUpdate: 0,
  agentNames: {},

  applySnapshot: (snap) => {
    const { agentNames } = get()
    // Обогащаем агентов именами
    const enrichedAgents: Record<string, AgentState> = {}
    for (const [key, agent] of Object.entries(snap.agents)) {
      enrichedAgents[key] = {
        ...agent,
        name: agentNames[agent.sipNo] || agent.name || agent.sipNo,
      }
    }
    set({
      agents: enrichedAgents,
      calls: snap.calls,
      queues: snap.queues,
      lastUpdate: Date.now(),
    })
  },

  setConnected: (connected) => set({ connected }),

  setAgentNames: (names) => {
    set({ agentNames: names })
    // Обогащаем существующих агентов
    set((state) => ({
      agents: Object.fromEntries(
        Object.entries(state.agents).map(([k, a]) => [
          k,
          { ...a, name: names[a.sipNo] || a.name || a.sipNo },
        ]),
      ),
    }))
  },

  onlineAgents: () =>
    Object.values(get().agents).filter((a) => a.status !== 'offline'),

  activeCallsCount: () => Object.keys(get().calls).length,

  waitingCount: () =>
    Object.values(get().queues).reduce((sum, q) => sum + q.waiting, 0),
}))

// ─────────────────────────────────────────
// UI STORE (глобальные состояния UI)
// ─────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean
  locale: 'ru' | 'en' | 'tj'
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setLocale: (locale: 'ru' | 'en' | 'tj') => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      locale: 'ru',
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'callcentrix-ui' },
  ),
)
