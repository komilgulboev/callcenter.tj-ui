import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CModal, CModalBody, CModalFooter,
  CModalHeader, CModalTitle, CForm, CFormInput, CFormLabel,
  CFormSelect, CFormTextarea, CTable, CTableBody, CTableDataCell,
  CTableHead, CTableHeaderCell, CTableRow, CBadge, CAlert, CSpinner,
  CInputGroup, CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilSearch } from '@coreui/icons'
import { tickets as ticketsApi } from 'src/api'

const STATUSES = ['new', 'open', 'pending', 'resolved', 'closed']
const STATUS_COLOR = { new: 'primary', open: 'warning', pending: 'info', resolved: 'success', closed: 'secondary' }
const PRIORITY_COLOR = { low: 'secondary', normal: 'info', high: 'warning', urgent: 'danger' }
const EMPTY = { subject: '', callerNo: '', body: '', priority: 'normal', status: 'new' }

export default function Tickets() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    ticketsApi.list({ status: statusFilter || undefined, search: search || undefined })
      .then((d) => setRows(d.tickets ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await ticketsApi.create(form)
      setModal(false)
      setForm(EMPTY)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">Tickets</h4>
        <CButton color="primary" onClick={() => setModal(true)}>
          <CIcon icon={cilPlus} className="me-2" />New Ticket
        </CButton>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      {/* Filters */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <form onSubmit={handleSearch} className="d-flex gap-2">
          <CInputGroup style={{ width: 260 }}>
            <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
            <CFormInput placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </CInputGroup>
          <CButton type="submit" color="light">Search</CButton>
        </form>
        <CFormSelect style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </CFormSelect>
      </div>

      <CCard>
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <CTable hover responsive className="cursor-pointer">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Subject</CTableHeaderCell>
                  <CTableHeaderCell>Caller</CTableHeaderCell>
                  <CTableHeaderCell>Priority</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Created</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((t) => (
                  <CTableRow key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                    <CTableDataCell className="text-muted">#{t.id}</CTableDataCell>
                    <CTableDataCell className="fw-semibold">{t.subject}</CTableDataCell>
                    <CTableDataCell>{t.callerNo || '—'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={PRIORITY_COLOR[t.priority] ?? 'secondary'}>{t.priority}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLOR[t.status] ?? 'secondary'}>{t.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-muted small">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {!rows.length && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-muted py-4">No tickets found</CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={modal} onClose={() => setModal(false)} size="lg">
        <CModalHeader><CModalTitle>New Ticket</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div>
              <CFormLabel>Subject</CFormLabel>
              <CFormInput value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief description of the issue" />
            </div>
            <div className="row g-2">
              <div className="col">
                <CFormLabel>Caller Number</CFormLabel>
                <CFormInput value={form.callerNo} onChange={(e) => setForm({ ...form, callerNo: e.target.value })} placeholder="+992…" />
              </div>
              <div className="col">
                <CFormLabel>Priority</CFormLabel>
                <CFormSelect value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </CFormSelect>
              </div>
            </div>
            <div>
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Detailed description…" />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving || !form.subject}>
            {saving ? <CSpinner size="sm" /> : 'Create Ticket'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
