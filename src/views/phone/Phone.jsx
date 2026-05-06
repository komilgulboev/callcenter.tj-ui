import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CCard, CCardBody, CCardHeader, CBadge, CButton, CRow, CCol,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormInput, CFormTextarea, CFormSelect,
  CSpinner, CNav, CNavItem, CNavLink, CTabContent, CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPhone, cilMediaStop, cilMicrophone, cilVolumeOff,
  cilMediaPause, cilMediaPlay, cilPlus, cilExternalLink,
  cilReload, cilPencil, cilCommentSquare,
} from '@coreui/icons'
import usePhoneStore from 'src/store/phone'
import useAuthStore from 'src/store/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const STATUS_COLOR = {
  idle: 'secondary', connecting: 'warning', registered: 'success',
  ringing_in: 'warning', ringing_out: 'info', active: 'success',
  on_hold: 'warning', failed: 'danger',
}
const STATUS_LABEL = {
  idle: 'Offline', connecting: 'Connecting…', registered: 'Ready',
  ringing_in: 'Incoming Call', ringing_out: 'Calling…',
  active: 'On Call', on_hold: 'On Hold', failed: 'Connection Failed',
}
const PRIORITY_COLOR      = { low: 'info', normal: 'secondary', high: 'warning', urgent: 'danger' }
const TICKET_STATUS_COLOR = { new: 'primary', open: 'warning', pending: 'info', resolved: 'success', closed: 'secondary' }

function fmtDuration(s) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const KEYPAD = [
  ['1',''],['2','ABC'],['3','DEF'],
  ['4','GHI'],['5','JKL'],['6','MNO'],
  ['7','PQR'],['8','TUV'],['9','WXY'],
  ['*',''],['0','+'],['#',''],
]

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
}

// ─── Ticket Create Modal ──────────────────────────────────────
function TicketCreateModal({ visible, onClose, callerNo, calleeNo, onCreated }) {
  const [form, setForm]     = useState({ subject: '', body: '', priority: 'normal', status: 'new' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (visible) { setForm({ subject: '', body: '', priority: 'normal', status: 'new' }); setError('') }
  }, [visible])

  const handleSubmit = async () => {
    if (!form.subject.trim()) { setError('Введите тему'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ subject: form.subject, body: form.body, callerNo, calleeNo, priority: form.priority, status: form.status }),
      })
      if (!res.ok) throw new Error('Ошибка сохранения')
      const data = await res.json()
      onCreated(data.id); onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader><CModalTitle>Создать тикет по звонку</CModalTitle></CModalHeader>
      <CModalBody>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <CForm>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel>Номер звонящего</CFormLabel>
              <CFormInput value={callerNo} readOnly className="bg-light" />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Внутренний номер</CFormLabel>
              <CFormInput value={calleeNo} readOnly className="bg-light" />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Тема <span className="text-danger">*</span></CFormLabel>
              <CFormInput placeholder="Кратко опишите проблему или запрос" value={form.subject}
                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} autoFocus />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Описание</CFormLabel>
              <CFormTextarea rows={3} placeholder="Подробности звонка…" value={form.body}
                onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Приоритет</CFormLabel>
              <CFormSelect value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
                <option value="urgent">Срочный</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Статус</CFormLabel>
              <CFormSelect value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="new">Новый</option>
                <option value="open">Открыт</option>
                <option value="pending">В ожидании</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={saving}>Отмена</CButton>
        <CButton color="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPlus} className="me-2" />}
          Создать тикет
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ─── Ticket Edit Modal ────────────────────────────────────────
function TicketEditModal({ ticketId, visible, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('edit')
  const [ticket, setTicket]       = useState(null)
  const [comments, setComments]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [form, setForm] = useState({ subject: '', body: '', status: 'new', priority: 'normal' })

  useEffect(() => {
    if (!visible || !ticketId) return
    setLoading(true); setError(''); setActiveTab('edit'); setCommentText('')
    Promise.all([
      fetch(`${API_URL}/api/tickets/${ticketId}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API_URL}/api/tickets/${ticketId}/comments`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([t, c]) => {
      setTicket(t)
      setForm({ subject: t.subject, body: t.body, status: t.status, priority: t.priority })
      setComments(c.comments || [])
    }).catch(() => setError('Ошибка загрузки'))
    .finally(() => setLoading(false))
  }, [ticketId, visible])

  const handleSave = async () => {
    if (!form.subject.trim()) { setError('Введите тему'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ subject: form.subject, body: form.body, callerNo: ticket?.callerNo || '', status: form.status, priority: form.priority }),
      })
      if (!res.ok) throw new Error('Ошибка сохранения')
      onSaved(); onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ text: commentText }),
      })
      if (!res.ok) throw new Error('Ошибка')
      const added = await res.json()
      // Перезагружаем комментарии
      const c = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, { headers: authHeaders() }).then(r => r.json())
      setComments(c.comments || [])
      setCommentText('')
    } catch (e) { setError(e.message) }
    finally { setSendingComment(false) }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>
          Тикет #{ticketId}
          {ticket && (
            <CBadge color={TICKET_STATUS_COLOR[ticket.status] || 'secondary'} className="ms-2">
              {ticket.status}
            </CBadge>
          )}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        {loading ? (
          <div className="text-center py-4"><CSpinner /></div>
        ) : (
          <>
            <CNav variant="tabs" className="mb-3">
              <CNavItem>
                <CNavLink active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} style={{ cursor: 'pointer' }}>
                  <CIcon icon={cilPencil} className="me-1" />Редактировать
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink active={activeTab === 'comments'} onClick={() => setActiveTab('comments')} style={{ cursor: 'pointer' }}>
                  <CIcon icon={cilCommentSquare} className="me-1" />
                  Комментарии
                  {comments.length > 0 && <CBadge color="secondary" className="ms-1">{comments.length}</CBadge>}
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              {/* ── Вкладка редактирования ── */}
              <CTabPane visible={activeTab === 'edit'}>
                <CForm>
                  <CRow className="g-3">
                    {ticket && (
                      <>
                        <CCol md={6}>
                          <CFormLabel className="text-muted small">Номер звонящего</CFormLabel>
                          <CFormInput value={ticket.callerNo || '—'} readOnly className="bg-light" />
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="text-muted small">Номер назначения</CFormLabel>
                          <CFormInput value={ticket.calleeNo || '—'} readOnly className="bg-light" />
                        </CCol>
                      </>
                    )}
                    <CCol xs={12}>
                      <CFormLabel>Тема <span className="text-danger">*</span></CFormLabel>
                      <CFormInput value={form.subject}
                        onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} />
                    </CCol>
                    <CCol xs={12}>
                      <CFormLabel>Описание</CFormLabel>
                      <CFormTextarea rows={4} value={form.body}
                        onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Статус</CFormLabel>
                      <CFormSelect value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="new">Новый</option>
                        <option value="open">Открыт</option>
                        <option value="pending">В ожидании</option>
                        <option value="resolved">Решён</option>
                        <option value="closed">Закрыт</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Приоритет</CFormLabel>
                      <CFormSelect value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
                        <option value="low">Низкий</option>
                        <option value="normal">Обычный</option>
                        <option value="high">Высокий</option>
                        <option value="urgent">Срочный</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>
                </CForm>
              </CTabPane>

              {/* ── Вкладка комментариев ── */}
              <CTabPane visible={activeTab === 'comments'}>
                <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                  {comments.length === 0 ? (
                    <div className="text-center text-muted py-4">Комментариев пока нет</div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="mb-3 p-3 rounded" style={{ background: 'var(--cui-tertiary-bg, #f8f9fa)' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <strong className="small">{c.username}</strong>
                          <span className="text-muted small">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-top pt-3">
                  <CFormLabel>Добавить комментарий</CFormLabel>
                  <CFormTextarea
                    rows={3}
                    placeholder="Напишите комментарий…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleAddComment()
                    }}
                  />
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span className="text-muted small">Ctrl+Enter для отправки</span>
                    <CButton color="primary" size="sm" onClick={handleAddComment}
                      disabled={!commentText.trim() || sendingComment}>
                      {sendingComment ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilCommentSquare} className="me-1" />}
                      Отправить
                    </CButton>
                  </div>
                </div>
              </CTabPane>
            </CTabContent>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>Закрыть</CButton>
        {activeTab === 'edit' && (
          <CButton color="primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPencil} className="me-2" />}
            Сохранить изменения
          </CButton>
        )}
        <a href={`/#/tickets/${ticketId}`} target="_blank" rel="noreferrer">
          <CButton color="light">
            <CIcon icon={cilExternalLink} className="me-1" />Открыть полностью
          </CButton>
        </a>
      </CModalFooter>
    </CModal>
  )
}

// ─── Main Phone Component ─────────────────────────────────────
export default function Phone() {
  const [dial, setDial]                     = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTicketId, setEditTicketId]     = useState(null)
  const [callerTickets, setCallerTickets]   = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [activeCallerNo, setActiveCallerNo] = useState('')
  const [cdrToday, setCdrToday]             = useState([])
  const [cdrLoading, setCdrLoading]         = useState(false)
  const [ticketRefresh, setTicketRefresh]   = useState(0)

  const user = useAuthStore(s => s.user)
  const { status, remoteNumber, callDuration, isMuted, call, answer, hangup, toggleMute, toggleHold, sendDtmf } = usePhoneStore()

  const inCall          = ['ringing_in','ringing_out','active','on_hold'].includes(status)
  const canCreateTicket = ['ringing_in','active','on_hold'].includes(status)

  useEffect(() => {
    if (remoteNumber) setActiveCallerNo(remoteNumber)
  }, [remoteNumber])

  useEffect(() => {
    if (!activeCallerNo) return
    setTicketsLoading(true)
    fetch(`${API_URL}/api/tickets?caller_no=${encodeURIComponent(activeCallerNo)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setCallerTickets(d.tickets || []))
      .catch(() => {})
      .finally(() => setTicketsLoading(false))
  }, [activeCallerNo, ticketRefresh])

  const loadCDR = useCallback(() => {
    setCdrLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    fetch(`${API_URL}/api/cdr?date_from=${today}&limit=500`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setCdrToday(d.records || []))
      .catch(() => {})
      .finally(() => setCdrLoading(false))
  }, [])

  useEffect(() => { loadCDR() }, [])

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current !== 'registered' && status === 'registered') loadCDR()
    prevStatus.current = status
  }, [status])

  const handleKey = (key) => {
    setDial(d => d + key)
    if (status === 'active') sendDtmf(key)
  }
  const handleDial = () => {
    if (!dial.trim()) return
    call(dial.trim()); setDial('')
  }

  return (
    <div>
      <audio id="cx-remote-audio" autoPlay />

      <div className="d-flex align-items-center gap-3 mb-4">
        <h4 className="mb-0">Phone</h4>
        <CBadge color={STATUS_COLOR[status] ?? 'secondary'} className="px-3 py-2">
          {STATUS_LABEL[status] ?? status}
        </CBadge>
        {user && <span className="text-muted small ms-auto">Extension: <strong>{user.username}</strong></span>}
      </div>

      <CRow className="g-3">

        {/* ── Левая колонка: диалпад ── */}
        <CCol lg={4} xl={3}>

          {status === 'ringing_in' && (
            <CCard className="border-warning mb-3">
              <CCardBody className="text-center py-4">
                <div style={{ fontSize: 48 }}>📲</div>
                <div className="text-muted mt-1">Входящий звонок</div>
                <div className="fs-2 fw-bold my-2">{remoteNumber}</div>
                <div className="d-flex gap-3 justify-content-center mt-3">
                  <CButton color="success" size="lg" onClick={answer} className="px-4">
                    <CIcon icon={cilPhone} className="me-2" />Ответить
                  </CButton>
                  <CButton color="danger" size="lg" onClick={hangup} className="px-4">
                    <CIcon icon={cilMediaStop} className="me-2" />Отклонить
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}

          {['ringing_out','active','on_hold'].includes(status) && (
            <CCard className={`mb-3 border-${STATUS_COLOR[status]}`}>
              <CCardBody className="text-center py-3">
                <div className="text-muted small">
                  {status === 'ringing_out' ? '⏳ Звоним…' : status === 'on_hold' ? '⏸ На удержании' : '🔊 Активный звонок'}
                </div>
                <div className="fs-2 fw-bold my-2">{remoteNumber}</div>
                {status === 'active' && <div className="fs-4 text-muted mb-3">{fmtDuration(callDuration)}</div>}
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                  <CButton color={isMuted ? 'warning' : 'light'} onClick={toggleMute} className="px-3">
                    <CIcon icon={isMuted ? cilVolumeOff : cilMicrophone} />
                    <span className="ms-1 small">{isMuted ? 'Вкл.' : 'Откл.'}</span>
                  </CButton>
                  <CButton color={status === 'on_hold' ? 'info' : 'light'} onClick={toggleHold} className="px-3">
                    <CIcon icon={status === 'on_hold' ? cilMediaPlay : cilMediaPause} />
                    <span className="ms-1 small">{status === 'on_hold' ? 'Возобн.' : 'Удерж.'}</span>
                  </CButton>
                  <CButton color="danger" onClick={hangup} className="px-3">
                    <CIcon icon={cilMediaStop} />
                    <span className="ms-1 small">Завершить</span>
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}

          {canCreateTicket && (
            <CButton color="primary" className="w-100 mb-3" onClick={() => setShowCreateModal(true)}>
              <CIcon icon={cilPlus} className="me-2" />Создать тикет
            </CButton>
          )}

          <CCard>
            <CCardHeader>Набор номера</CCardHeader>
            <CCardBody>
              <div className="input-group mb-3">
                <input
                  className="form-control text-center fs-5 fw-bold"
                  value={inCall ? remoteNumber : dial}
                  onChange={(e) => !inCall && setDial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !inCall && handleDial()}
                  placeholder="Введите номер…"
                  readOnly={inCall}
                />
                {!inCall && dial && (
                  <CButton color="light" onClick={() => setDial(d => d.slice(0,-1))}>⌫</CButton>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {KEYPAD.map(([key, sub]) => (
                  <CButton key={key} color="light" onClick={() => handleKey(key)} className="py-3"
                    style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <span className="fw-bold fs-5 lh-1">{key}</span>
                    {sub && <span style={{ fontSize:9, opacity:0.5, letterSpacing:1 }}>{sub}</span>}
                  </CButton>
                ))}
              </div>
              <CButton color="success" className="w-100 mt-3" size="lg"
                onClick={handleDial} disabled={!dial.trim() || inCall}>
                <CIcon icon={cilPhone} className="me-2" />Позвонить
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        {/* ── Правая колонка: тикеты абонента ── */}
        <CCol lg={8} xl={9}>
          <CCard style={{ height: '100%' }}>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span>
                Тикеты абонента
                {activeCallerNo && <strong className="ms-2 text-primary">{activeCallerNo}</strong>}
              </span>
              <div className="d-flex align-items-center gap-2">
                <CBadge color={callerTickets.length > 0 ? 'warning' : 'secondary'}>{callerTickets.length}</CBadge>
                {canCreateTicket && (
                  <CButton size="sm" color="primary" onClick={() => setShowCreateModal(true)}>
                    <CIcon icon={cilPlus} className="me-1" />Новый тикет
                  </CButton>
                )}
                {activeCallerNo && (
                  <CButton size="sm" color="light" onClick={() => setTicketRefresh(k => k+1)}
                    disabled={ticketsLoading} title="Обновить">
                    <CIcon icon={cilReload} />
                  </CButton>
                )}
              </div>
            </CCardHeader>
            <CCardBody className="p-0" style={{ minHeight: 220, maxHeight: 420, overflowY: 'auto' }}>
              {!activeCallerNo ? (
                <div className="text-center text-muted py-5">
                  <div style={{ fontSize: 40 }}>📞</div>
                  <div className="mt-2">Тикеты появятся при звонке</div>
                  <div className="small mt-1">Или нажмите 📋 в таблице звонков ниже</div>
                </div>
              ) : ticketsLoading ? (
                <div className="text-center py-5"><CSpinner size="sm" /></div>
              ) : callerTickets.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <div style={{ fontSize: 36 }}>📋</div>
                  <div className="mt-2">Нет тикетов для <strong>{activeCallerNo}</strong></div>
                  {canCreateTicket && (
                    <CButton color="primary" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
                      <CIcon icon={cilPlus} className="me-1" />Создать первый тикет
                    </CButton>
                  )}
                </div>
              ) : (
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Тема</th>
                      <th>Статус</th>
                      <th>Приоритет</th>
                      <th>Дата создания</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callerTickets.map(t => (
                      <tr key={t.id}>
                        <td className="text-muted">{t.id}</td>
                        <td style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {t.subject}
                        </td>
                        <td><CBadge color={TICKET_STATUS_COLOR[t.status] || 'secondary'}>{t.status}</CBadge></td>
                        <td><CBadge color={PRIORITY_COLOR[t.priority] || 'secondary'}>{t.priority}</CBadge></td>
                        <td className="text-muted small">{new Date(t.createdAt).toLocaleString()}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <CButton size="sm" color="light" title="Редактировать / комментировать"
                              onClick={() => setEditTicketId(t.id)}>
                              <CIcon icon={cilPencil} size="sm" />
                            </CButton>
                            <a href={`/#/tickets/${t.id}`} target="_blank" rel="noreferrer">
                              <CButton size="sm" color="light" title="Открыть в новой вкладке">
                                <CIcon icon={cilExternalLink} size="sm" />
                              </CButton>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Звонки за сегодня ── */}
      <CRow className="mt-3">
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span>Звонки за сегодня</span>
              <div className="d-flex align-items-center gap-2">
                <CBadge color="secondary">{cdrToday.length}</CBadge>
                <CButton size="sm" color="light" onClick={loadCDR} disabled={cdrLoading} title="Обновить">
                  {cdrLoading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody className="p-0" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {cdrLoading && cdrToday.length === 0 ? (
                <div className="text-center py-4"><CSpinner size="sm" /></div>
              ) : cdrToday.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <div style={{ fontSize: 36 }}>📋</div>
                  <div className="mt-2">Звонков сегодня ещё не было</div>
                </div>
              ) : (
                <table className="table table-hover table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Тип</th>
                      <th>Откуда</th>
                      <th>Куда</th>
                      <th>Время</th>
                      <th>Разговор</th>
                      <th>Длит. общая</th>
                      <th>Статус</th>
                      <th>Тикеты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cdrToday.map(c => {
                      const isOutbound = c.src === user?.username
                      const callerNum  = isOutbound ? c.dst : c.src
                      return (
                        <tr key={c.id}>
                          <td>
                            <CBadge color={isOutbound ? 'info' : 'success'}>
                              {isOutbound ? '↗ Исх.' : '↙ Вх.'}
                            </CBadge>
                          </td>
                          <td className="fw-semibold text-primary" style={{ cursor:'pointer' }}
                            onClick={() => !inCall && setDial(callerNum)} title="Нажмите для перезвона">
                            {c.src}
                          </td>
                          <td className="text-muted">{c.dst}</td>
                          <td className="text-muted">{new Date(c.callDate).toLocaleTimeString()}</td>
                          <td>{c.billsec > 0 ? fmtDuration(c.billsec) : '—'}</td>
                          <td>{c.duration > 0 ? fmtDuration(c.duration) : '—'}</td>
                          <td>
                            <CBadge color={c.disposition === 'ANSWERED' ? 'success' : 'danger'}>
                              {c.disposition === 'ANSWERED' ? 'Отвечен' : 'Пропущен'}
                            </CBadge>
                          </td>
                          <td>
                            <CButton size="sm" color="light"
                              onClick={() => setActiveCallerNo(callerNum)}
                              title="Показать тикеты абонента">
                              📋
                            </CButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Модалки */}
      <TicketCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        callerNo={activeCallerNo}
        calleeNo={user?.username || ''}
        onCreated={() => setTicketRefresh(k => k+1)}
      />
      <TicketEditModal
        ticketId={editTicketId}
        visible={!!editTicketId}
        onClose={() => setEditTicketId(null)}
        onSaved={() => { setTicketRefresh(k => k+1); setEditTicketId(null) }}
      />
    </div>
  )
}
