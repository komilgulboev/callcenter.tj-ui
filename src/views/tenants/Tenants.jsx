import React, { useEffect, useState } from 'react'
import {
  CButton, CCard, CCardBody, CModal, CModalBody,
  CModalFooter, CModalHeader, CModalTitle, CForm, CFormInput,
  CFormLabel, CTable, CTableBody, CTableDataCell, CTableHead,
  CTableHeaderCell, CTableRow, CBadge, CAlert, CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilCheckCircle, cilBan } from '@coreui/icons'
import { tenants as tenantsApi } from 'src/api'

const EMPTY = { name: '', domain: '', maxUsers: '', maxOperators: '' }

export default function Tenants() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)

  const load = () => {
    setLoading(true)
    tenantsApi.list()
      .then((d) => setRows(d.tenants ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit   = (t)  => { setEditing(t); setForm({ name: t.name, domain: t.domain, maxUsers: t.maxUsers ?? '', maxOperators: t.maxOperators ?? '' }); setModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, maxUsers: parseInt(form.maxUsers) || 50 }
      if (editing) await tenantsApi.update(editing.id, payload)
      else         await tenantsApi.create(payload)
      setModal(false); load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this tenant?')) return
    try { await tenantsApi.remove(id); load() }
    catch (e) { setError(e.message) }
  }

  const handleToggle = async (t) => {
    try {
      if (t.active) await tenantsApi.deactivate(t.id)
      else          await tenantsApi.activate(t.id)
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">Tenants</h4>
        <CButton color="primary" onClick={openCreate}>
          <CIcon icon={cilPlus} className="me-2" />New Tenant
        </CButton>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      <CCard>
        <CCardBody className="p-0">
          {loading ? <div className="text-center py-5"><CSpinner /></div> : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Domain</CTableHeaderCell>
                  <CTableHeaderCell>Max Users</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((t) => (
                  <CTableRow key={t.id}>
                    <CTableDataCell className="fw-semibold">{t.name}</CTableDataCell>
                    <CTableDataCell className="text-muted">{t.domain}</CTableDataCell>
                    <CTableDataCell>{t.maxUsers ?? '—'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={t.active ? 'success' : 'secondary'}>{t.active ? 'Active' : 'Inactive'}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <CButton size="sm" color="light" onClick={() => openEdit(t)}><CIcon icon={cilPencil} /></CButton>
                        <CButton size="sm" color={t.active ? 'warning' : 'success'} onClick={() => handleToggle(t)}>
                          <CIcon icon={t.active ? cilBan : cilCheckCircle} />
                        </CButton>
                        <CButton size="sm" color="danger" onClick={() => handleDelete(t.id)}><CIcon icon={cilTrash} /></CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {!rows.length && (
                  <CTableRow><CTableDataCell colSpan={5} className="text-center text-muted py-4">No tenants yet</CTableDataCell></CTableRow>
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={modal} onClose={() => setModal(false)}>
        <CModalHeader><CModalTitle>{editing ? 'Edit Tenant' : 'New Tenant'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div><CFormLabel>Name</CFormLabel><CFormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" /></div>
            <div><CFormLabel>Domain</CFormLabel><CFormInput value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="acme.example.com" /></div>
            <div><CFormLabel>Max Users</CFormLabel><CFormInput type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} placeholder="50" /></div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving}>{saving ? <CSpinner size="sm" /> : 'Save'}</CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
