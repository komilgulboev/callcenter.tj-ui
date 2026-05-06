import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert, CButton, CCard, CCardBody, CCardHeader,
  CBadge, CFormSelect, CFormTextarea, CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSend } from '@coreui/icons'
import { tickets as ticketsApi } from 'src/api'
import useAuthStore from 'src/store/auth'

const STATUS_COLOR = { new: 'primary', open: 'warning', pending: 'info', resolved: 'success', closed: 'secondary' }
const STATUSES     = ['new', 'open', 'pending', 'resolved', 'closed']

export default function TicketDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)

  const [ticket,   setTicket]   = useState(null)
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [comment,  setComment]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [status,   setStatus]   = useState('')

  const load = () => {
    Promise.all([ticketsApi.get(id), ticketsApi.comments(id)])
      .then(([t, c]) => { setTicket(t); setStatus(t.status); setComments(c.comments ?? c) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleStatusChange = async (s) => {
    setStatus(s)
    try { await ticketsApi.update(id, { status: s }) }
    catch (e) { setError(e.message) }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await ticketsApi.comment(id, comment)
      setComment('')
      const c = await ticketsApi.comments(id)
      setComments(c.comments ?? c)
    } catch (e) { setError(e.message) }
    finally { setSending(false) }
  }

  if (loading) return <div className="text-center py-5"><CSpinner /></div>
  if (!ticket)  return <CAlert color="danger">Ticket not found</CAlert>

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <CButton color="light" onClick={() => navigate('/tickets')}>
          <CIcon icon={cilArrowLeft} />
        </CButton>
        <h4 className="mb-0">#{ticket.id} — {ticket.subject}</h4>
        <CBadge color={STATUS_COLOR[status] ?? 'secondary'} className="ms-auto">{status}</CBadge>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      <div className="row g-3">
        <div className="col-lg-8">
          {/* Description */}
          <CCard className="mb-3">
            <CCardHeader>Description</CCardHeader>
            <CCardBody>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{ticket.body || 'No description.'}</p>
            </CCardBody>
          </CCard>

          {/* Comments */}
          <CCard>
            <CCardHeader>Comments ({comments.length})</CCardHeader>
            <CCardBody>
              {comments.length === 0 && <p className="text-muted">No comments yet.</p>}
              {comments.map((c, i) => (
                <div key={i} className={`d-flex gap-3 mb-3 ${c.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`px-3 py-2 rounded-3 ${c.userId === user?.id ? 'bg-primary text-white' : 'bg-light'}`}
                    style={{ maxWidth: '75%' }}
                  >
                    <div className="small fw-semibold mb-1 opacity-75">{c.username}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                    <div className="small opacity-50 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}

              <div className="d-flex gap-2 mt-3">
                <CFormTextarea
                  rows={2}
                  placeholder="Write a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleComment()}
                />
                <CButton color="primary" onClick={handleComment} disabled={sending || !comment.trim()}>
                  <CIcon icon={cilSend} />
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </div>

        {/* Sidebar info */}
        <div className="col-lg-4">
          <CCard>
            <CCardHeader>Details</CCardHeader>
            <CCardBody>
              <div className="mb-3">
                <label className="small text-muted d-block">Status</label>
                <CFormSelect value={status} onChange={(e) => handleStatusChange(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </CFormSelect>
              </div>
              <div className="mb-2">
                <span className="small text-muted">Caller</span>
                <div>{ticket.callerNo || '—'}</div>
              </div>
              <div className="mb-2">
                <span className="small text-muted">Priority</span>
                <div><CBadge color="info">{ticket.priority}</CBadge></div>
              </div>
              <div className="mb-2">
                <span className="small text-muted">Created</span>
                <div>{new Date(ticket.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="small text-muted">Updated</span>
                <div>{new Date(ticket.updatedAt).toLocaleString()}</div>
              </div>
            </CCardBody>
          </CCard>
        </div>
      </div>
    </>
  )
}
