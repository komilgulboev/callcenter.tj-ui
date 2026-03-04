import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  CButton, CCard, CCardBody, CFormInput, CFormSelect,
  CSpinner, CBadge, CRow, CCol, CInputGroup, CInputGroupText,
  CFormTextarea, CAlert,
} from '@coreui/react'
import { useTranslation } from 'react-i18next'
import { getApiUrl, getAuthHeaders } from '../../api'

const PAGE_SIZE = 20

// ─── API ────────────────────────────────────────────────────
const api = {
  getTickets: (params) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v) })
    return fetch(getApiUrl('/api/crm/tickets?' + q), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : { tickets: [], total: 0 })
      .catch(() => ({ tickets: [], total: 0 }))
  },
  getTicket: (id) =>
    fetch(getApiUrl('/api/crm/tickets/' + id), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null).catch(() => null),
  getStatuses: () =>
    fetch(getApiUrl('/api/crm/statuses'), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : []).catch(() => []),
  getAgents: () =>
    fetch(getApiUrl('/api/crm/agents'), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : []).catch(() => []),
  addUpdate: (id, body) =>
    fetch(getApiUrl('/api/crm/tickets/' + id + '/updates'), {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error() }),
  assignTicket: (id, userId) =>
    fetch(getApiUrl('/api/crm/tickets/' + id + '/assign'), {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ userId }),
    }).then(r => { if (!r.ok) throw new Error() }),
}

// ─── STATUS BADGE ────────────────────────────────────────────
const STATUS_COLORS = {
  new: '#fb8c00', in_progress: '#1976d2',
  pending_info: '#8e24aa', rejected: '#e53935', closed: '#43a047',
}
function StatusBadge({ code, color }) {
  const { t } = useTranslation('crm')
  const bg = color || STATUS_COLORS[code] || '#6c757d'
  return (
    <span style={{
      background: bg, color: '#fff', borderRadius: 20,
      padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {t('statuses.' + code, { defaultValue: code })}
    </span>
  )
}

// ─── TICKET ROW ──────────────────────────────────────────────
function TicketRow({ ticket, selected, onClick }) {
  const isSelected = selected?.id === ticket.id
  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
      border: isSelected ? '2px solid #0d6efd' : '1px solid #e9ecef',
      background: isSelected ? '#f0f6ff' : '#fff',
      transition: 'all .12s',
    }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* ID */}
        <span style={{ fontSize: 12, color: '#adb5bd', minWidth: 36, fontWeight: 600 }}>
          #{ticket.id}
        </span>

        {/* Основная информация */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ticket.subject}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#6c757d' }}>
            {ticket.callFrom && <span>📞 {ticket.callFrom}</span>}
            {ticket.categoryName && <span>📂 {ticket.categoryName}</span>}
            <span>👤 {ticket.createdByName}</span>
            <span>📅 {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}</span>
            {ticket.assignedToName && (
              <span style={{ color: '#0d6efd' }}>🎯 {ticket.assignedToName}</span>
            )}
          </div>
        </div>

        {/* Статус */}
        <StatusBadge code={ticket.statusCode} color={ticket.statusColor} />
      </div>
    </div>
  )
}

// ─── TICKET DETAIL PANEL ─────────────────────────────────────
function TicketDetailPanel({ ticket, statuses, agents, onClose, onUpdated }) {
  const { t } = useTranslation('crm')
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [newStatus, setNewStatus]   = useState(String(ticket.statusId))
  const [assignTo, setAssignTo]     = useState(ticket.assignedTo ? String(ticket.assignedTo) : '')
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState(null)
  const [error, setError]           = useState(null)
  const savedStatus = useRef(String(ticket.statusId))

  useEffect(() => {
    setLoading(true)
    api.getTicket(ticket.id).then(d => {
      setDetail(d)
      const sid = String(d?.ticket?.statusId ?? ticket.statusId)
      setNewStatus(sid)
      savedStatus.current = sid
      setAssignTo(d?.ticket?.assignedTo ? String(d.ticket.assignedTo) : '')
    }).finally(() => setLoading(false))
  }, [ticket.id])

  const handleSave = async () => {
    const statusChanged = newStatus !== savedStatus.current
    const assignChanged = assignTo !== (ticket.assignedTo ? String(ticket.assignedTo) : '')
    if (!comment.trim() && !statusChanged && !assignChanged) return

    setSaving(true); setError(null)
    try {
      if (comment.trim() || statusChanged) {
        await api.addUpdate(ticket.id, {
          description: comment.trim() || undefined,
          statusId: statusChanged ? parseInt(newStatus) : undefined,
        })
      }
      if (assignChanged) {
        await api.assignTicket(ticket.id, assignTo ? parseInt(assignTo) : null)
      }
      const d = await api.getTicket(ticket.id)
      setDetail(d)
      const sid = String(d?.ticket?.statusId ?? newStatus)
      savedStatus.current = sid
      setNewStatus(sid)
      setAssignTo(d?.ticket?.assignedTo ? String(d.ticket.assignedTo) : '')
      setComment('')
      setSuccess(t('updateAdded'))
      setTimeout(() => setSuccess(null), 2500)
      onUpdated()
    } catch {
      setError(t('phone.createError'))
    } finally {
      setSaving(false)
    }
  }

  const updates = detail?.updates || []
  const currentTicket = detail?.ticket || ticket

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 13 }}>
      {/* ── Шапка ── */}
      <div style={{ background: '#e8f0fe', borderRadius: '8px 8px 0 0', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              #{currentTicket.id} {currentTicket.subject}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <StatusBadge code={currentTicket.statusCode} color={currentTicket.statusColor} />
              {currentTicket.categoryName && <span style={{ color: '#6c757d', fontSize: 12 }}>📂 {currentTicket.categoryName}</span>}
              {currentTicket.callFrom && <span style={{ color: '#6c757d', fontSize: 12 }}>📞 {currentTicket.callFrom}</span>}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>👤 {currentTicket.createdByName}</span>
              <span>📅 {new Date(currentTicket.createdAt).toLocaleString('ru-RU')}</span>
              {currentTicket.assignedToName && <span style={{ color: '#0d6efd' }}>🎯 {currentTicket.assignedToName}</span>}
            </div>
            {currentTicket.description && (
              <p style={{ margin: '8px 0 0', color: '#495057', fontSize: 12 }}>{currentTicket.description}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6c757d', padding: '0 0 0 12px' }}>✕</button>
        </div>
      </div>

      {/* ── История ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#fff', minHeight: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 11, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          {t('history')}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 20 }}><CSpinner size="sm" /></div>}
        {!loading && updates.length === 0 && (
          <div style={{ color: '#adb5bd', fontSize: 12, textAlign: 'center', padding: 20 }}>{t('noHistory')}</div>
        )}
        {!loading && updates.map(u => {
          const isAssign = u.assignedTo !== undefined && u.assignedTo !== null && !u.description && !u.statusCode
          const borderColor = isAssign ? '#fd7e14' : u.statusCode ? '#0d6efd' : '#dee2e6'
          return (
            <div key={u.id} style={{
              padding: '8px 12px', marginBottom: 8, background: '#f8f9fa', borderRadius: 8,
              borderLeft: '3px solid ' + borderColor,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 11 }}>👤 {u.createdByName}</span>
                <span style={{ fontSize: 10, color: '#adb5bd' }}>{new Date(u.createdAt).toLocaleString('ru-RU')}</span>
              </div>
              {isAssign && (
                <div style={{ fontSize: 12, color: '#fd7e14', fontWeight: 500 }}>
                  🎯 Назначено: {u.assignedToName || 'не назначен'}
                </div>
              )}
              {u.statusCode && <div style={{ marginBottom: 3 }}><StatusBadge code={u.statusCode} /></div>}
              {u.description && <div style={{ fontSize: 12, color: '#212529' }}>{u.description}</div>}
            </div>
          )
        })}
      </div>

      {/* ── Форма ── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', borderRadius: '0 0 8px 8px', flexShrink: 0 }}>
        {success && <div style={{ background: '#d1e7dd', color: '#0a3622', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>✅ {success}</div>}
        {error && <div style={{ background: '#f8d7da', color: '#58151c', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {/* Статус */}
          <CFormSelect value={newStatus} onChange={e => setNewStatus(e.target.value)}
            style={{ fontSize: 12, flex: 1 }}>
            {statuses.map(s => (
              <option key={s.id} value={String(s.id)}>
                {t('statuses.' + s.code, { defaultValue: s.code })}
              </option>
            ))}
          </CFormSelect>

          {/* Назначить */}
          <CFormSelect value={assignTo} onChange={e => setAssignTo(e.target.value)}
            style={{ fontSize: 12, flex: 1 }}>
            <option value="">{t('notAssigned', { defaultValue: 'Не назначен' })}</option>
            {agents.map(a => (
              <option key={a.id} value={String(a.id)}>{a.name}</option>
            ))}
          </CFormSelect>
        </div>

        <CFormTextarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder={t('commentPlaceholder')} rows={2}
          style={{ fontSize: 12, resize: 'none', marginBottom: 8 }} />

        <CButton size="sm" color="primary" onClick={handleSave}
          disabled={saving || (!comment.trim() && newStatus === savedStatus.current && assignTo === (ticket.assignedTo ? String(ticket.assignedTo) : ''))}
          style={{ width: '100%' }}>
          {saving && <CSpinner size="sm" className="me-2" />}
          {saving ? t('submitting') : t('save')}
        </CButton>
      </div>
    </div>
  )
}

// ─── PAGINATION ──────────────────────────────────────────────
function Pagination({ total, offset, limit, onChange }) {
  const totalPages = Math.ceil(total / limit)
  const cur = Math.floor(offset / limit)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i)
    .filter(p => p === 0 || p === totalPages - 1 || Math.abs(p - cur) <= 1)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 12 }}>
      <PBtn disabled={cur === 0} onClick={() => onChange(Math.max(0, offset - limit))}>‹</PBtn>
      {pages.map((p, i) => (
        <React.Fragment key={p}>
          {pages[i - 1] !== undefined && p - pages[i - 1] > 1 && (
            <span style={{ color: '#adb5bd', fontSize: 12 }}>…</span>
          )}
          <PBtn active={p === cur} onClick={() => onChange(p * limit)}>{p + 1}</PBtn>
        </React.Fragment>
      ))}
      <PBtn disabled={cur === totalPages - 1} onClick={() => onChange(Math.min((totalPages - 1) * limit, offset + limit))}>›</PBtn>
      <span style={{ fontSize: 11, color: '#6c757d', marginLeft: 6 }}>
        {offset + 1}–{Math.min(offset + limit, total)} / {total}
      </span>
    </div>
  )
}

const PBtn = ({ children, active, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{
    minWidth: 30, height: 28, padding: '0 8px', fontSize: 13,
    border: '1px solid ' + (active ? '#0d6efd' : '#dee2e6'),
    borderRadius: 6, background: active ? '#0d6efd' : '#fff',
    color: active ? '#fff' : '#212529', cursor: disabled ? 'default' : 'pointer',
    fontWeight: active ? 600 : 400, opacity: disabled ? 0.4 : 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }}>{children}</button>
)

// ─── MAIN TICKETS PAGE ───────────────────────────────────────
export default function Tickets() {
  const { t } = useTranslation('crm')
  const [tickets, setTickets]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [statuses, setStatuses] = useState([])
  const [agents, setAgents]     = useState([])

  // Фильтры
  const [search, setSearch]         = useState('')
  const [statusId, setStatusId]     = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [offset, setOffset]         = useState(0)
  const searchTimer = useRef(null)

  const load = useCallback(async (params) => {
    setLoading(true)
    try {
      const data = await api.getTickets({ ...params, limit: PAGE_SIZE })
      setTickets(data.tickets ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  const currentFilters = useCallback(() => ({
    search, statusId, dateFrom, dateTo, assignedTo, offset,
  }), [search, statusId, dateFrom, dateTo, assignedTo, offset])

  useEffect(() => {
    Promise.all([api.getStatuses(), api.getAgents()])
      .then(([s, a]) => { setStatuses(s); setAgents(a) })
    load({ search, statusId, dateFrom, dateTo, assignedTo, offset: 0 })
  }, []) // eslint-disable-line

  const applyFilters = (overrides = {}) => {
    const f = { search, statusId, dateFrom, dateTo, assignedTo, offset: 0, ...overrides }
    setOffset(0)
    load(f)
  }

  const handleSearch = (val) => {
    setSearch(val)
    setOffset(0)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      load({ search: val, statusId, dateFrom, dateTo, assignedTo, offset: 0 })
    }, 400)
  }

  const handlePage = (newOffset) => {
    setOffset(newOffset)
    load({ search, statusId, dateFrom, dateTo, assignedTo, offset: newOffset })
  }

  const handleReset = () => {
    setSearch(''); setStatusId(''); setDateFrom(''); setDateTo(''); setAssignedTo(''); setOffset(0)
    load({ search: '', statusId: '', dateFrom: '', dateTo: '', assignedTo: '', offset: 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CRow className="g-3" style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 0, flexWrap: 'nowrap' }}>

        {/* ── СПИСОК ЗАЯВОК ── */}
        <CCol style={{ height: '100%', paddingLeft: 0, flex: selected ? '0 0 55%' : '0 0 100%', maxWidth: selected ? '55%' : '100%', transition: 'all .2s' }}>
          <CCard style={{ height: '100%', marginBottom: 0 }}>
            <CCardBody style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>

              {/* ── Заголовок ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>📋 {t('title')}</span>
                  {total > 0 && <CBadge color="primary">{total}</CBadge>}
                </div>
                {loading && <CSpinner size="sm" color="primary" />}
              </div>

              {/* ── Фильтры ── */}
              <div style={{ marginBottom: 12, flexShrink: 0 }}>
                {/* Строка 1: поиск + статус + назначен */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <CInputGroup size="sm" style={{ flex: '1 1 200px' }}>
                    <CInputGroupText style={{ fontSize: 12 }}>🔍</CInputGroupText>
                    <CFormInput value={search} onChange={e => handleSearch(e.target.value)}
                      placeholder={t('searchPlaceholder')} style={{ fontSize: 12 }} />
                    {search && (
                      <CButton variant="outline" color="secondary" size="sm"
                        onClick={() => handleSearch('')} style={{ fontSize: 12 }}>✕</CButton>
                    )}
                  </CInputGroup>

                  <CFormSelect size="sm" value={statusId}
                    onChange={e => { setStatusId(e.target.value); applyFilters({ statusId: e.target.value }) }}
                    style={{ flex: '0 0 140px', fontSize: 12 }}>
                    <option value="">{t('allStatuses')}</option>
                    {statuses.map(s => (
                      <option key={s.id} value={String(s.id)}>
                        {t('statuses.' + s.code, { defaultValue: s.code })}
                      </option>
                    ))}
                  </CFormSelect>

                  <CFormSelect size="sm" value={assignedTo}
                    onChange={e => { setAssignedTo(e.target.value); applyFilters({ assignedTo: e.target.value }) }}
                    style={{ flex: '0 0 150px', fontSize: 12 }}>
                    <option value="">👤 Все исполнители</option>
                    {agents.map(a => (
                      <option key={a.id} value={String(a.id)}>{a.name}</option>
                    ))}
                  </CFormSelect>
                </div>

                {/* Строка 2: даты */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <CInputGroup size="sm" style={{ flex: '0 0 auto' }}>
                    <CInputGroupText style={{ fontSize: 11 }}>с</CInputGroupText>
                    <CFormInput type="date" value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }) }}
                      style={{ fontSize: 12, width: 130 }} />
                  </CInputGroup>
                  <CInputGroup size="sm" style={{ flex: '0 0 auto' }}>
                    <CInputGroupText style={{ fontSize: 11 }}>по</CInputGroupText>
                    <CFormInput type="date" value={dateTo}
                      onChange={e => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }) }}
                      style={{ fontSize: 12, width: 130 }} />
                  </CInputGroup>
                  {(search || statusId || dateFrom || dateTo || assignedTo) && (
                    <CButton size="sm" variant="outline" color="secondary" onClick={handleReset}
                      style={{ fontSize: 12 }}>
                      Сбросить фильтры
                    </CButton>
                  )}
                </div>
              </div>

              {/* ── Список ── */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {!loading && tickets.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#adb5bd' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🗂️</div>
                    <div style={{ fontSize: 13 }}>{t('noTickets')}</div>
                  </div>
                )}
                {tickets.map(ticket => (
                  <TicketRow key={ticket.id} ticket={ticket} selected={selected}
                    onClick={() => setSelected(selected?.id === ticket.id ? null : ticket)} />
                ))}
              </div>

              {/* ── Пейджинг ── */}
              {total > PAGE_SIZE && (
                <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={handlePage} />
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* ── ДЕТАЛЬНАЯ ПАНЕЛЬ ── */}
        {selected && (
          <CCol style={{ height: '100%', paddingRight: 0, flex: '0 0 45%', maxWidth: '45%' }}>
            <CCard style={{ height: '100%', marginBottom: 0 }}>
              <CCardBody style={{ height: '100%', overflow: 'hidden', padding: 0 }}>
                <TicketDetailPanel
                  ticket={selected}
                  statuses={statuses}
                  agents={agents}
                  onClose={() => setSelected(null)}
                  onUpdated={() => {
                    load({ search, statusId, dateFrom, dateTo, assignedTo, offset })
                    // Обновляем selected тоже
                    api.getTicket(selected.id).then(d => {
                      if (d?.ticket) setSelected(prev => ({ ...prev, ...d.ticket }))
                    })
                  }}
                />
              </CCardBody>
            </CCard>
          </CCol>
        )}

      </CRow>
    </div>
  )
}