// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export type UserType = 0 | 1 | 3 // 0=SuperAdmin, 1=TenantAdmin, 3=Operator
export type UserRole = 0 | 1 | 2  // 0=Operator, 1=Supervisor, 2=HR

export interface AuthClaims {
  id: number
  username: string
  tenantId: number
  userType: UserType
  role: UserRole
  exp: number
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthClaims
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────

export interface User {
  id: number
  username: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  sipNo?: string
  tenantId?: number
  type: UserType
  role: UserRole
  status: 'enable' | 'disable'
  avatarUrl?: string
  createdAt: string
}

export function userDisplayName(user: Pick<User, 'firstName' | 'lastName' | 'username'>): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return full || user.username
}

// ─────────────────────────────────────────
// TENANT
// ─────────────────────────────────────────

export interface Tenant {
  id: number
  tenantId: number
  name: string
  businessProfile?: string
  representatives?: string
  taxId?: string
  representativesContact?: string
  website?: string
  companyContact?: string
  location?: string
  maxUsers: number
  status: boolean
  tariffId?: number
  createdAt: string
}

export interface TenantWithStats extends Tenant {
  userCount: number
  tariffName?: string
  tariffMaxOperators?: number
  tariffFee?: number
}

export interface Tariff {
  id: number
  name: string
  maxOperators: number
  monthlyFee: number
}

export interface CreateTenantInput {
  name: string
  businessProfile?: string
  representatives?: string
  taxId?: string
  representativesContact?: string
  website?: string
  companyContact?: string
  location?: string
  maxUsers: number
  tariffId?: number
}

// ─────────────────────────────────────────
// REAL-TIME MONITOR
// ─────────────────────────────────────────

export type AgentStatus = 'offline' | 'idle' | 'ringing' | 'in-call' | 'paused'

export interface AgentState {
  sipNo: string
  name?: string
  status: AgentStatus
  callId?: string
  ipAddress?: string
}

export interface LiveCall {
  id: string
  from: string
  to: string
  channel: string
  channels?: string[]
  startedAt: string // ISO string
}

export interface QueueStats {
  name: string
  agents: number
  inCall: number
  waiting: number
  completed: number
  holdTime: number
  talkTime: number
  sla: number
}

export interface MonitorSnapshot {
  type: 'snapshot'
  agents: Record<string, AgentState>
  calls: Record<string, LiveCall>
  queues: Record<string, QueueStats>
}

// Вычисляет длительность звонка в секундах
export function callDuration(call: LiveCall): number {
  return Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000)
}

// Форматирует секунды как MM:SS
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────
// CDR
// ─────────────────────────────────────────

export type CallDisposition = 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED'

export interface CDRRecord {
  id: number
  uniqueId: string
  src: string
  dst: string
  channel: string
  dstChannel: string
  callDate: string
  duration: number
  billSec: number
  disposition: CallDisposition
  agentName?: string
  recordingUrl?: string
}

export interface CDRStats {
  total: number
  answered: number
  missed: number
  avgDuration: number
  totalSeconds: number
}

export interface CDRPage {
  records: CDRRecord[]
  stats: CDRStats
  total: number
  page: number
  perPage: number
}

export interface CDRFilter {
  dateFrom?: string
  dateTo?: string
  src?: string
  dst?: string
  disposition?: CallDisposition
  page?: number
  perPage?: number
}

// ─────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────

export interface DailyStats {
  date: string
  total: number
  answered: number
  missed: number
  avgWait: number
  avgTalk: number
}

export interface AgentStats {
  sipNo: string
  name: string
  total: number
  answered: number
  missed: number
  avgTalk: number
  totalSec: number
}

// ─────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: number
  tenantId: number
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  categoryId?: number
  assignedTo?: number
  createdBy: number
  clientPhone?: string
  clientName?: string
  callId?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  assigneeName?: string
  categoryName?: string
}

export interface TicketComment {
  id: number
  ticketId: number
  authorId: number
  author: string
  body: string
  createdAt: string
}

export interface TicketCategory {
  id: number
  tenantId: number
  name: string
  color: string
}

// ─────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  perPage: number
}
