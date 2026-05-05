import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  CButton, CCard, CCardBody, CAlert, CInputGroup, CFormInput,
  CFormTextarea, CFormSelect, CSpinner, CBadge, CRow, CCol,
} from '@coreui/react'
import { useTranslation } from 'react-i18next'
import sipService from '../../services/sip.service'
import { getApiUrl, getAuthHeaders } from '../../api'

const PAGE_SIZE = 10


// ─── API ────────────────────────────────────────────────────
const crmApi = {
  getMyCatalog: () =>
    fetch(getApiUrl('/api/crm/my-catalog'), { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),

  getTickets: ({ phone, search, offset = 0, limit = PAGE_SIZE }) => {
    const params = new URLSearchParams()
    // phone — фильтр по звонящему (передаём отдельно если нет ручного поиска)
    if (search) params.set('search', search)
    else if (phone) params.set('search', phone)
    params.set('limit', limit)
    params.set('offset', offset)
    return fetch(getApiUrl('/api/crm/tickets?' + params.toString()), {
      headers: getAuthHeaders(),
    }).then((r) => (r.ok ? r.json() : { tickets: [], total: 0 })).catch(() => ({ tickets: [], total: 0 }))
  },

  createTicket: (body) =>
    fetch(getApiUrl('/api/crm/tickets'), {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
    }).then((r) => { if (!r.ok) throw new Error('Failed'); return r.json() }),

  getTicket: (id) =>
    fetch(getApiUrl('/api/crm/tickets/' + id), { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),

  addUpdate: (id, body) =>
    fetch(getApiUrl('/api/crm/tickets/' + id + '/updates'), {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
    }).then((r) => { if (!r.ok) throw new Error('Failed') }),

  changeStatus: (id, statusId) =>
    fetch(getApiUrl('/api/crm/tickets/' + id + '/status'), {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ statusId }),
    }).then((r) => { if (!r.ok) throw new Error('Failed') }),

  getStatuses: () =>
    fetch(getApiUrl('/api/crm/statuses'), { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),

  // Активный звонок агента — sipUsername берётся из JWT на бэкенде
  getActiveCall: () =>
    fetch(getApiUrl('/api/actions/my-call'), { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
}

// ─── StatusBadge ────────────────────────────────────────────
const STATUS_BADGE_COLOR = {
  new: 'warning', in_progress: 'primary',
  pending_info: 'info', rejected: 'danger', closed: 'success',
}
function StatusBadge({ code, color }) {
  const { t } = useTranslation('crm')
  return (
    <CBadge color={STATUS_BADGE_COLOR[code] || 'secondary'}
      style={color ? { backgroundColor: color, border: 'none' } : {}}>
      {t('statuses.' + code, { defaultValue: code })}
    </CBadge>
  )
}

// ─── NewTicketForm ───────────────────────────────────────────
function NewTicketForm({ callFrom, onCreated }) {
  const { t } = useTranslation('crm')
  const [catalog, setCatalog] = useState(null)
  const [subject, setSubject] = useState('')
  const [desc, setDesc]       = useState('')
  const [catId, setCatId]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { crmApi.getMyCatalog().then(setCatalog) }, [])

  const isActive = !!callFrom

  const handleSubmit = async () => {
    if (!subject.trim()) { setError(t('subject') + ' ' + t('phone.subjectRequired')); return }
    if (!callFrom)       { setError(t('phone.noActiveCall')); return }
    setSaving(true); setError(null)
    try {
      const uniqueid = sipService.currentSession?.id || ('manual-' + Date.now())
      const ticket = await crmApi.createTicket({
        callUniqueid: uniqueid, callFrom,
        subject: subject.trim(),
        description: desc.trim() || undefined,
        categoryId: catId ? parseInt(catId) : undefined,
      })
      setSuccess(true)
      setSubject(''); setDesc(''); setCatId('')
      setTimeout(() => setSuccess(false), 3000)
      onCreated && onCreated(ticket)
    } catch {
      setError(t('phone.createError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #dee2e6' }}>
        <span>📋</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{t('newTicket')}</span>
        {!isActive && <CBadge color="secondary" style={{ marginLeft: 'auto', fontSize: 10 }}>{t('phone.waitingForCall')}</CBadge>}
      </div>
      {success && <CAlert color="success" className="py-2 px-3 mb-3" style={{ fontSize: 13 }}>✅ {t('ticketCreated')}</CAlert>}
      {error && <CAlert color="danger" className="py-2 px-3 mb-3" style={{ fontSize: 13 }} dismissible onClose={() => setError(null)}>{error}</CAlert>}
      <div className="mb-3">
        <label style={labelSt}>{t('caller')}</label>
        <CFormInput value={callFrom || '—'} disabled style={{ fontSize: 13, background: '#f8f9fa' }} />
      </div>
      <div className="mb-3">
        <label style={labelSt}>{t('subject')} <span style={{ color: '#dc3545' }}>*</span></label>
        <CFormInput value={subject} onChange={e => setSubject(e.target.value)}
          placeholder={t('subject')} disabled={!isActive} style={{ fontSize: 13 }} />
      </div>
      <div className="mb-3">
        <label style={labelSt}>{t('category')}</label>
        {catalog?.categories?.length > 0 ? (
          <CFormSelect value={catId} onChange={e => setCatId(e.target.value)} disabled={!isActive} style={{ fontSize: 13 }}>
            <option value="">{t('selectCategory')}</option>
            {catalog.categories.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </CFormSelect>
        ) : (
          <div style={{ fontSize: 12, color: '#6c757d', padding: '6px 0' }}>{t('noCatalog')}</div>
        )}
      </div>
      <div className="mb-3">
        <label style={labelSt}>{t('description')}</label>
        <CFormTextarea value={desc} onChange={e => setDesc(e.target.value)}
          rows={3} placeholder={t('description')} disabled={!isActive} style={{ fontSize: 13, resize: 'vertical' }} />
      </div>
      <CButton color="primary" onClick={handleSubmit} disabled={saving || !isActive} style={{ width: '100%' }}>
        {saving && <CSpinner size="sm" className="me-2" />}
        {t('save')}
      </CButton>
    </div>
  )
}

// ─── TicketItem ──────────────────────────────────────────────
function TicketItem({ ticket, isSelected, onClick }) {
  const date = new Date(ticket.createdAt).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
      border: isSelected ? '2px solid #0d6efd' : '1px solid #dee2e6',
      background: isSelected ? '#f0f6ff' : '#fff', transition: 'all .15s',
    }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, marginRight: 8 }}>
          #{ticket.id} {ticket.subject}
        </span>
        <StatusBadge code={ticket.statusCode} color={ticket.statusColor} />
      </div>
      <div style={{ fontSize: 11, color: '#6c757d' }}>
        {ticket.categoryName && <span className="me-2">📂 {ticket.categoryName}</span>}
        <span>📅 {date}</span>
        <span className="ms-2">👤 {ticket.createdByName}</span>
      </div>
      {ticket.description && (
        <div style={{ fontSize: 12, color: '#495057', marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {ticket.description}
        </div>
      )}
    </div>
  )
}

// ─── TicketDetail ────────────────────────────────────────────
function TicketDetail({ ticket, onClose, onUpdated }) {
  const { t } = useTranslation('crm')
  const [detail, setDetail]     = useState(null)
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [comment, setComment]   = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(null)
  const [error, setError]       = useState(null)
  // savedStatusId — актуальный статус в БД (обновляется после сохранения)
  const savedStatusId = useRef(String(ticket.statusId))

  useEffect(() => {
    setLoading(true)
    setDetail(null)
    setStatuses([])
    setNewStatus('')
    Promise.all([
      crmApi.getTicket(ticket.id),
      crmApi.getStatuses(),
    ]).then(([d, s]) => {
      setDetail(d)
      // s — массив статусов из /api/crm/statuses
      const arr = Array.isArray(s) ? s : []
      setStatuses(arr)
      // Берём актуальный statusId из детального тикета или из пропа
      const currentStatusId = d?.ticket?.statusId ?? ticket.statusId
      savedStatusId.current = String(currentStatusId)
      setNewStatus(String(currentStatusId))
    }).finally(() => setLoading(false))
  }, [ticket.id])

  const handleSubmit = async () => {
    if (!comment.trim() && newStatus === savedStatusId.current) {
      setError(t('commentPlaceholder'))
      return
    }
    setSubmitting(true); setError(null)
    try {
      const statusChanged = newStatus && newStatus !== savedStatusId.current
      // Добавляем обновление (комментарий и/или смена статуса)
      await crmApi.addUpdate(ticket.id, {
        description: comment.trim() || undefined,
        statusId: statusChanged ? parseInt(newStatus) : undefined,
      })
      setComment('')
      // Перезагружаем детали
      const d = await crmApi.getTicket(ticket.id)
      setDetail(d)
      const freshStatusId = d?.ticket?.statusId
      if (freshStatusId) {
        savedStatusId.current = String(freshStatusId)
        setNewStatus(String(freshStatusId))
      }
      setSuccess(statusChanged ? t('statusChanged') : t('commentAdded'))
      setTimeout(() => setSuccess(null), 2500)
      onUpdated && onUpdated()
    } catch {
      setError(t('phone.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  // Актуальный статус: из свежезагруженного detail или из пропа
  const currentStatus = detail?.ticket || ticket
  const t_status = currentStatus.statusCode
  const t_updates = detail?.updates || []

  return (
    <div style={{ border: '1px solid #b8d0f8', borderRadius: 10, marginBottom: 12, overflow: 'hidden', fontSize: 13 }}>
      {/* ── Шапка ── */}
      <div style={{ background: '#e8f0fe', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            #{ticket.id} {ticket.subject}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <StatusBadge code={t_status} color={ticket.statusColor} />
            {ticket.categoryName && <span style={{ color: '#6c757d', fontSize: 12 }}>📂 {ticket.categoryName}</span>}
            <span style={{ color: '#6c757d', fontSize: 11 }}>📞 {ticket.callFrom}</span>
            <span style={{ color: '#6c757d', fontSize: 11 }}>👤 {ticket.createdByName}</span>
            <span style={{ color: '#6c757d', fontSize: 11 }}>📅 {new Date(ticket.createdAt).toLocaleString('ru-RU')}</span>
          </div>
          {ticket.description && (
            <p style={{ margin: '6px 0 0', color: '#495057', fontSize: 12 }}>{ticket.description}</p>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6c757d', padding: '0 0 0 10px', lineHeight: 1 }}>✕</button>
      </div>

      {/* ── История обновлений ── */}
      <div style={{ padding: '10px 14px', background: '#fff' }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: '#6c757d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('history')}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 10 }}><CSpinner size="sm" /></div>}

        {!loading && t_updates.length === 0 && (
          <div style={{ color: '#adb5bd', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>{t('noHistory')}</div>
        )}

        {!loading && t_updates.length > 0 && (
          <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
            {t_updates.map(u => {
              const isAssign = u.assignedTo != null && !u.description && !u.statusCode
              const borderColor = isAssign ? '#fd7e14' : u.statusCode ? '#0d6efd' : '#dee2e6'
              return (
                <div key={u.id} style={{ padding: '7px 10px', marginBottom: 6, background: '#f8f9fa', borderRadius: 6, borderLeft: '3px solid ' + borderColor }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 11, color: '#495057' }}>👤 {u.createdByName}</span>
                    <span style={{ fontSize: 10, color: '#adb5bd' }}>{new Date(u.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  {isAssign && <div style={{ fontSize: 12, color: '#fd7e14', fontWeight: 500 }}>🎯 Назначено: {u.assignedToName || '—'}</div>}
                  {u.statusCode && (
                    <div style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#6c757d' }}>{t('status')}: </span>
                      <StatusBadge code={u.statusCode} />
                    </div>
                  )}
                  {u.description && <div style={{ fontSize: 12, color: '#212529' }}>{u.description}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Форма добавления обновления ── */}
        {success && <div style={{ background: '#d1e7dd', color: '#0a3622', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>✅ {success}</div>}
        {error && <div style={{ background: '#f8d7da', color: '#58151c', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {/* Смена статуса */}
          {statuses.length > 0 && (
            <CFormSelect value={newStatus} onChange={e => setNewStatus(e.target.value)}
              style={{ fontSize: 12, flex: '0 0 auto', width: 'auto' }}>
              {statuses.map(s => (
                <option key={s.id} value={String(s.id)}>
                  {t('statuses.' + s.code, { defaultValue: s.code })}
                </option>
              ))}
            </CFormSelect>
          )}
        </div>

        <CFormTextarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('commentPlaceholder')}
          rows={2}
          style={{ fontSize: 12, resize: 'none', marginBottom: 8 }}
        />

        <CButton size="sm" color="primary" onClick={handleSubmit}
          disabled={submitting || (!comment.trim() && newStatus === savedStatusId.current)}
          style={{ width: '100%' }}>
          {submitting && <CSpinner size="sm" className="me-2" />}
          {submitting ? t('submitting') : t('addComment')}
        </CButton>
      </div>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────
function Pagination({ total, offset, limit, onChange }) {
  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit)
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 0; i < totalPages; i++) pages.push(i)

  // Показываем максимум 5 страниц вокруг текущей
  const visible = pages.filter(p =>
    p === 0 || p === totalPages - 1 ||
    Math.abs(p - currentPage) <= 1
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 10, flexShrink: 0 }}>
      {/* Назад */}
      <button
        onClick={() => onChange(Math.max(0, offset - limit))}
        disabled={currentPage === 0}
        style={{ ...pageBtnSt, opacity: currentPage === 0 ? 0.4 : 1 }}
      >‹</button>

      {visible.map((p, i) => {
        const prev = visible[i - 1]
        return (
          <React.Fragment key={p}>
            {prev !== undefined && p - prev > 1 && (
              <span style={{ color: '#6c757d', fontSize: 12 }}>…</span>
            )}
            <button
              onClick={() => onChange(p * limit)}
              style={{
                ...pageBtnSt,
                background: p === currentPage ? '#0d6efd' : '#fff',
                color: p === currentPage ? '#fff' : '#212529',
                borderColor: p === currentPage ? '#0d6efd' : '#dee2e6',
                fontWeight: p === currentPage ? 600 : 400,
              }}
            >{p + 1}</button>
          </React.Fragment>
        )
      })}

      {/* Вперёд */}
      <button
        onClick={() => onChange(Math.min((totalPages - 1) * limit, offset + limit))}
        disabled={currentPage === totalPages - 1}
        style={{ ...pageBtnSt, opacity: currentPage === totalPages - 1 ? 0.4 : 1 }}
      >›</button>

      <span style={{ fontSize: 11, color: '#6c757d', marginLeft: 6 }}>
        {offset + 1}–{Math.min(offset + limit, total)} / {total}
      </span>
    </div>
  )
}

// ─── TicketHistory ───────────────────────────────────────────
function TicketHistory({ phone, refreshKey }) {
  const { t } = useTranslation('crm')
  const [tickets, setTickets]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')
  const [offset, setOffset]     = useState(0)
  const searchTimer             = useRef(null)

  const load = useCallback(async ({ ph, sq, off }) => {
    if (!ph && !sq) { setTickets([]); setTotal(0); return }
    setLoading(true)
    try {
      const data = await crmApi.getTickets({ phone: ph, search: sq, offset: off, limit: PAGE_SIZE })
      setTickets(data.tickets ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setTickets([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // При смене номера — сбрасываем поиск и страницу
  useEffect(() => {
    setSearch('')
    setOffset(0)
    setSelected(null)
    load({ ph: phone, sq: '', off: 0 })
  }, [phone, refreshKey]) // eslint-disable-line

  // Поиск с debounce 400ms
  const handleSearch = (val) => {
    setSearch(val)
    setOffset(0)
    setSelected(null)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      load({ ph: phone, sq: val, off: 0 })
    }, 400)
  }

  // Смена страницы
  const handlePage = (newOffset) => {
    setOffset(newOffset)
    setSelected(null)
    load({ ph: phone, sq: search, off: newOffset })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Заголовок ── */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📁</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{t('title')}</span>
          {total > 0 && <CBadge color="primary">{total}</CBadge>}
        </div>
        {phone && <span style={{ fontSize: 12, color: '#6c757d' }}>📞 {phone}</span>}
      </div>

      {/* ── Поиск (показываем если есть phone или уже что-то нашли) ── */}
      {(phone || search) && (
        <div style={{ flexShrink: 0, marginBottom: 10 }}>
          <CInputGroup size="sm">
            <CFormInput
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              style={{ fontSize: 12 }}
            />
            {search && (
              <CButton variant="outline" color="secondary" onClick={() => handleSearch('')} style={{ fontSize: 12 }}>
                ✕
              </CButton>
            )}
          </CInputGroup>
        </div>
      )}

      {/* ── Нет звонка ── */}
      {!phone && !search && (
        <div style={emptyStateSt}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📞</div>
          <div style={{ color: '#6c757d', fontSize: 13 }}>{t('phone.waitingCall')}</div>
        </div>
      )}

      {/* ── Загрузка ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: '#6c757d', fontSize: 13 }}>
          <CSpinner size="sm" className="me-2" />{t('phone.loadingTickets')}
        </div>
      )}

      {/* ── Нет заявок ── */}
      {!loading && (phone || search) && tickets.length === 0 && (
        <div style={emptyStateSt}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗂️</div>
          <div style={{ color: '#6c757d', fontSize: 13 }}>{t('noTickets')}</div>
          {search && (
            <div style={{ color: '#adb5bd', fontSize: 12, marginTop: 4 }}>
              {t('searchPlaceholder')}: «{search}»
            </div>
          )}
        </div>
      )}

      {/* ── Список ── */}
      {!loading && tickets.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {selected && (
            <TicketDetail
              ticket={selected}
              onClose={() => setSelected(null)}
              onUpdated={() => load({ ph: phone, sq: search, off: offset })}
            />
          )}
          {tickets.map(ticket => (
            <TicketItem key={ticket.id} ticket={ticket}
              isSelected={selected?.id === ticket.id}
              onClick={() => setSelected(selected?.id === ticket.id ? null : ticket)}
            />
          ))}
        </div>
      )}

      {/* ── Пейджинг ── */}
      {!loading && total > PAGE_SIZE && (
        <Pagination
          total={total}
          offset={offset}
          limit={PAGE_SIZE}
          onChange={handlePage}
        />
      )}
    </div>
  )
}

// ─── WebPhone ────────────────────────────────────────────────
const WebPhone = () => {
  const { t } = useTranslation('crm')
  const [status, setStatus]         = useState('connecting')
  const [error, setError]           = useState(null)
  const [incoming, setIncoming]     = useState(null)
  const [state, setState]           = useState('idle')
  const [number, setNumber]         = useState('')
  const [callFrom, setCallFrom]     = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [restored, setRestored]     = useState(false)
  const [showReloadWarning, setShowReloadWarning] = useState(false)



  useEffect(() => {
    sipService.setListeners({
      onRegistered:   () => { setStatus('connected'); setError(null) },
      onDisconnected: () => { setStatus('error'); setError(t('phone.disconnected')) },
      onError:        (msg) => { setStatus('error'); setError(msg) },
      onIncoming:     (data) => {
        if (data?.from) {
          setCallFrom(data.from)
          setRestored(false)
        }
        setIncoming(data)
      },
      onStateChange:  (s) => {
        setState(s)
        if (s !== 'ringing') setIncoming(null)
        if (s === 'idle') {
          setCallFrom(null)
          setRestored(false)

        }
      },
    })
    sipService.connect()

    // При загрузке страницы — берём sipUsername из JWT (бэкенд читает из токена)
    // и смотрим активный звонок в AgentStore (обновляется AMI)
    crmApi.getActiveCall().then((call) => {
      if (call?.active && call.callFrom) {
        setCallFrom(call.callFrom)
        setRestored(true)
      }
    })

    // Предупреждаем пользователя если он пытается закрыть/обновить страницу во время звонка
    const handleBeforeUnload = (e) => {
      if (sipService.state !== 'idle') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Перехватываем F5 и Ctrl+R — показываем свой диалог вместо обновления
    const handleKeyDown = (e) => {
      const isF5 = e.key === 'F5'
      const isCtrlR = (e.ctrlKey || e.metaKey) && e.key === 'r'
      if ((isF5 || isCtrlR) && sipService.state !== 'idle') {
        e.preventDefault()
        e.stopPropagation()
        setShowReloadWarning(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, []) // eslint-disable-line

  const handleCall = () => {
    if (!number.trim()) return
    setCallFrom(number.trim())
    setRestored(false)
    sipService.call(number.trim())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Диалог предупреждения об обновлении ── */}
      {showReloadWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, maxWidth: 380, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Идёт активный звонок
            </div>
            <div style={{ color: '#6c757d', fontSize: 13, marginBottom: 20 }}>
              Обновление страницы завершит звонок. Вы уверены?
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <CButton color="secondary" onClick={() => setShowReloadWarning(false)}>
                Остаться
              </CButton>
              <CButton color="danger" onClick={() => window.location.reload()}>
                Всё равно обновить
              </CButton>
            </div>
          </div>
        </div>
      )}

      <CRow className="g-3" style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 0, flexWrap: 'nowrap' }}>

        {/* ── ЛЕВАЯ КОЛОНКА ── */}
        <CCol xs={12} md={4} lg={3} style={{ height: '100%', paddingLeft: 0 }}>
          <CCard style={{ height: '100%', marginBottom: 0 }}>
            <CCardBody style={{ height: '100%', overflowY: 'auto' }}>
              <h5 className="mb-3">📞 {t('phone.title')}</h5>

              {restored && callFrom && (
                <CAlert color="warning" className="py-2 px-3 mb-2" style={{ fontSize: 12 }}>
                  ⚠️ Восстановлен звонок: <strong>{callFrom}</strong>
                  <div className="mt-1 d-flex gap-2">
                    <CButton size="sm" color="secondary" onClick={() => {
                      setCallFrom(null)
                      setRestored(false)
                    }}>Сбросить</CButton>
                  </div>
                </CAlert>
              )}

              {status === 'connecting' && (
                <CAlert color="info" className="py-2 px-3" style={{ fontSize: 13 }}>
                  <CSpinner size="sm" className="me-2" />{t('phone.connecting')}
                </CAlert>
              )}
              {status === 'connected' && (
                <CAlert color="success" className="py-2 px-3" style={{ fontSize: 13 }}>
                  ✅ {t('phone.connected')}
                </CAlert>
              )}
              {status === 'error' && (
                <CAlert color="danger" className="py-2 px-3" style={{ fontSize: 13 }}>
                  {error}
                  <div className="mt-2">
                    <CButton size="sm" onClick={() => sipService.connect()}>{t('phone.reconnect')}</CButton>
                  </div>
                </CAlert>
              )}

              {state === 'idle' && status === 'connected' && (
                <CInputGroup className="mt-2">
                  <CFormInput value={number} onChange={e => setNumber(e.target.value)}
                    placeholder={t('phone.number')} onKeyDown={e => e.key === 'Enter' && handleCall()} style={{ fontSize: 13 }} />
                  <CButton color="primary" onClick={handleCall} disabled={!number.trim()}>{t('phone.call')}</CButton>
                </CInputGroup>
              )}

              {incoming && (
                <CAlert color="warning" className="mt-2 py-2 px-3" style={{ fontSize: 13 }}>
                  📲 {t('phone.incoming')}: <strong>{incoming.from}</strong>
                  <div className="mt-2 d-flex gap-2">
                    <CButton size="sm" color="success" onClick={() => sipService.answer()}>{t('phone.answer')}</CButton>
                    <CButton size="sm" color="danger" onClick={() => sipService.hangup()}>{t('phone.reject')}</CButton>
                  </div>
                </CAlert>
              )}

              {state !== 'idle' && state !== 'ringing' && (
                <CAlert color="success" className="mt-2 py-2 px-3" style={{ fontSize: 13 }}>
                  <div>🔴 <strong>{state}</strong>{callFrom && <span style={{ marginLeft: 8, fontWeight: 600 }}>{callFrom}</span>}</div>
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    <CButton size="sm" variant="outline" onClick={() => sipService.mute()}>{t('phone.mute')}</CButton>
                    <CButton size="sm" variant="outline" onClick={() => sipService.unmute()}>{t('phone.unmute')}</CButton>
                    <CButton size="sm" variant="outline" onClick={() => sipService.hold()}>{t('phone.hold')}</CButton>
                    <CButton size="sm" variant="outline" onClick={() => sipService.unhold()}>{t('phone.unhold')}</CButton>
                    <CButton size="sm" color="danger" onClick={() => sipService.hangup()}>{t('phone.hangup')}</CButton>
                  </div>
                </CAlert>
              )}

              <NewTicketForm callFrom={callFrom} onCreated={() => setRefreshKey(k => k + 1)} />
            </CCardBody>
          </CCard>
        </CCol>

        {/* ── ПРАВАЯ КОЛОНКА ── */}
        <CCol xs={12} md={8} lg={9} style={{ height: '100%', paddingRight: 0 }}>
          <CCard style={{ height: '100%', marginBottom: 0 }}>
            <CCardBody style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <TicketHistory phone={callFrom} refreshKey={refreshKey} />
            </CCardBody>
          </CCard>
        </CCol>

      </CRow>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const labelSt = {
  display: 'block', fontSize: 12, fontWeight: 500, color: '#495057', marginBottom: 4,
}
const emptyStateSt = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  textAlign: 'center', padding: 40,
}
const pageBtnSt = {
  minWidth: 30, height: 28, padding: '0 8px', fontSize: 13,
  border: '1px solid #dee2e6', borderRadius: 6, background: '#fff',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

export default WebPhone