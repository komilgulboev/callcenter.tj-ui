import React, { useEffect, useState } from 'react'
import {
  CButton, CCard, CCardBody, CModal, CModalBody, CModalFooter,
  CModalHeader, CModalTitle, CForm, CFormInput, CFormLabel,
  CFormSelect, CTable, CTableBody, CTableDataCell, CTableHead,
  CTableHeaderCell, CTableRow, CBadge, CAlert, CSpinner, CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilCheckCircle, cilBan, cilPhone } from '@coreui/icons'
import { users as usersApi } from 'src/api'
import useAuthStore from 'src/store/auth'

const ROLE_LABELS = ['SuperAdmin', 'TenantAdmin', 'Supervisor', 'Operator']
const ROLE_COLORS = ['danger', 'primary', 'warning', 'info']
const EMPTY = { username: '', password: '', userType: '3', sipNo: '', firstName: '', lastName: '' }

export default function Users() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const currentUser = useAuthStore((s) => s.user)

  const load = () => {
    setLoading(true)
    usersApi.list()
      .then((d) => setRows(d.users ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit   = (u) => {
    setEditing(u)
    setForm({
      username: u.username, password: '',
      userType: String(u.userType),
      sipNo: u.sipNo ?? '',
      firstName: u.firstName ?? '',
      lastName:  u.lastName ?? '',
    })
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, userType: Number(form.userType) }
      if (!payload.password) delete payload.password
      // sipNo defaults to username for operators
      if (!payload.sipNo) payload.sipNo = payload.username
      if (editing) await usersApi.update(editing.id, payload)
      else         await usersApi.create(payload)
      setModal(false)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleToggle = async (u) => {
    try {
      if (u.active) await usersApi.deactivate(u.id)
      else          await usersApi.activate(u.id)
      load()
    } catch (e) { setError(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user? Their SIP account will also be removed.')) return
    try { await usersApi.remove(id); load() }
    catch (e) { setError(e.message) }
  }

  const availableRoles = currentUser?.userType === 0
    ? [
        { value: '0', label: 'SuperAdmin' },
        { value: '1', label: 'TenantAdmin' },
        { value: '2', label: 'Supervisor' },
        { value: '3', label: 'Operator' },
      ]
    : [
        { value: '2', label: 'Supervisor' },
        { value: '3', label: 'Operator' },
      ]

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">Users</h4>
          <small className="text-muted">Username = SIP extension number</small>
        </div>
        <CButton color="primary" onClick={openCreate}>
          <CIcon icon={cilPlus} className="me-2" />New User
        </CButton>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      <CCard>
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Username / SIP</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Role</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>SIP</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((u) => (
                  <CTableRow key={u.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{u.username}</div>
                      <div className="text-muted small d-flex align-items-center gap-1">
                        <CIcon icon={cilPhone} size="sm" />
                        {u.sipNo || u.username}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={ROLE_COLORS[u.userType] ?? 'secondary'}>
                        {ROLE_LABELS[u.userType] ?? u.userType}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={u.active ? 'success' : 'secondary'}>
                        {u.active ? '● Active' : '○ Inactive'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={u.active ? 'success' : 'light'} textColor={u.active ? undefined : 'muted'}>
                        {u.active ? 'Registered' : 'No SIP'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <CButton size="sm" color="light" onClick={() => openEdit(u)} title="Edit">
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          size="sm"
                          color={u.active ? 'warning' : 'success'}
                          onClick={() => handleToggle(u)}
                          title={u.active ? 'Deactivate (removes SIP)' : 'Activate (creates SIP)'}
                        >
                          <CIcon icon={u.active ? cilBan : cilCheckCircle} />
                        </CButton>
                        <CButton size="sm" color="danger" onClick={() => handleDelete(u.id)} title="Delete">
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {!rows.length && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-muted py-4">
                      No users yet. Create one — username must be the SIP extension number.
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={modal} onClose={() => setModal(false)}>
        <CModalHeader>
          <CModalTitle>{editing ? 'Edit User' : 'New User'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="info" className="small py-2">
            <strong>Username = SIP number</strong> — e.g. <code>1001</code>, <code>1002</code>.<br />
            The same credentials are used for the web phone.
          </CAlert>
          <CForm className="d-flex flex-column gap-3 mt-2">
            <div className="row g-2">
              <div className="col">
                <CFormLabel>First Name</CFormLabel>
                <CFormInput value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="col">
                <CFormLabel>Last Name</CFormLabel>
                <CFormInput value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <CFormLabel>Username (= SIP number)</CFormLabel>
              <CFormInput
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="1001"
              />
            </div>
            <div>
              <CFormLabel>{editing ? 'New Password (blank = keep)' : 'Password'}</CFormLabel>
              <CFormInput
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '••••••' : 'Enter password'}
              />
            </div>
            <div>
              <CFormLabel>Role</CFormLabel>
              <CFormSelect value={form.userType}
                onChange={(e) => setForm({ ...form, userType: e.target.value })}>
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </CFormSelect>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave}
            disabled={saving || !form.username || (!editing && !form.password)}>
            {saving ? <CSpinner size="sm" /> : editing ? 'Save' : 'Create'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
