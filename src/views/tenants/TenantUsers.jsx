import React, { useEffect, useState } from 'react'
import {
  CCard, CCardBody, CCardHeader, CButton, CBadge,
  CSpinner, CAlert, CFormInput, CInputGroup, CInputGroupText,
  CTable, CTableBody, CTableDataCell, CTableHead,
  CTableHeaderCell, CTableRow, CListGroup, CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilMinus, cilSearch, cilPeople, cilBuilding } from '@coreui/icons'
import { tenants as tenantsApi, users as usersApi } from 'src/api'

const ROLE_LABELS   = ['SuperAdmin', 'TenantAdmin', 'Supervisor', 'Operator']
const ROLE_COLORS   = ['danger', 'primary', 'warning', 'info']

export default function TenantUsers() {
  const [tenants,      setTenants]      = useState([])
  const [selected,     setSelected]     = useState(null)   // selected tenant
  const [allUsers,     setAllUsers]     = useState([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [search,       setSearch]       = useState('')
  const [saving,       setSaving]       = useState(null)   // userId being saved

  // Load tenants once
  useEffect(() => {
    tenantsApi.list()
      .then((d) => setTenants(d.tenants ?? d))
      .catch((e) => setError(e.message))
  }, [])

  // Load all users when tenant selected
  useEffect(() => {
    if (!selected) return
    setLoading(true)
    // Fetch all users (SuperAdmin endpoint returns all)
    usersApi.list()
      .then((d) => setAllUsers(d.users ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selected])

  const assignedUsers  = allUsers.filter(u => u.tenantId === selected?.id)
  const availableUsers = allUsers.filter(u =>
    u.tenantId == null &&
    u.userType !== 0 &&   // never assign SuperAdmin
    (search === '' ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()))
  )

  const assign = async (userId) => {
    setSaving(userId)
    try {
      await tenantsApi.assignUser(selected.id, userId)
      setAllUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, tenantId: selected.id } : u
      ))
    } catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  const unassign = async (userId) => {
    setSaving(userId)
    try {
      await tenantsApi.unassignUser(selected.id, userId)
      setAllUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, tenantId: null } : u
      ))
    } catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  return (
    <>
      <div className="d-flex align-items-center mb-4">
        <h4 className="mb-0">Tenant — User Assignment</h4>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      <div className="row g-3">

        {/* ── Tenant list ── */}
        <div className="col-lg-3">
          <CCard>
            <CCardHeader className="d-flex align-items-center gap-2">
              <CIcon icon={cilBuilding} /> Tenants
            </CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                {tenants.map((t) => (
                  <CListGroupItem
                    key={t.id}
                    active={selected?.id === t.id}
                    onClick={() => { setSelected(t); setSearch('') }}
                    className="d-flex justify-content-between align-items-center cursor-pointer"
                  >
                    <span>{t.name}</span>
                    <CBadge color={t.active ? 'success' : 'secondary'} shape="rounded-pill">
                      {allUsers.filter(u => u.tenantId === t.id).length}
                    </CBadge>
                  </CListGroupItem>
                ))}
                {!tenants.length && (
                  <CListGroupItem className="text-muted text-center py-3">
                    No tenants
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </div>

        {/* ── Right panel ── */}
        <div className="col-lg-9">
          {!selected ? (
            <CCard>
              <CCardBody className="text-center text-muted py-5">
                <div style={{ fontSize: 48 }}>👈</div>
                Select a tenant to manage its users
              </CCardBody>
            </CCard>
          ) : (
            <>
              {/* Assigned users */}
              <CCard className="mb-3">
                <CCardHeader className="d-flex align-items-center gap-2">
                  <CIcon icon={cilPeople} />
                  <span>Assigned to <strong>{selected.name}</strong></span>
                  <CBadge color="primary" className="ms-1">{assignedUsers.length}</CBadge>
                </CCardHeader>
                <CCardBody className="p-0">
                  {loading ? (
                    <div className="text-center py-4"><CSpinner size="sm" /></div>
                  ) : (
                    <CTable hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Username</CTableHeaderCell>
                          <CTableHeaderCell>Name</CTableHeaderCell>
                          <CTableHeaderCell>Role</CTableHeaderCell>
                          <CTableHeaderCell>SIP</CTableHeaderCell>
                          <CTableHeaderCell></CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {assignedUsers.map((u) => (
                          <CTableRow key={u.id}>
                            <CTableDataCell className="fw-semibold">{u.username}</CTableDataCell>
                            <CTableDataCell>
                              {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={ROLE_COLORS[u.userType] ?? 'secondary'}>
                                {ROLE_LABELS[u.userType] ?? u.userType}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="text-muted">{u.sipNo || '—'}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                size="sm" color="danger" variant="outline"
                                onClick={() => unassign(u.id)}
                                disabled={saving === u.id}
                              >
                                {saving === u.id
                                  ? <CSpinner size="sm" />
                                  : <><CIcon icon={cilMinus} className="me-1" />Remove</>}
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                        {!assignedUsers.length && (
                          <CTableRow>
                            <CTableDataCell colSpan={5} className="text-center text-muted py-3">
                              No users assigned yet
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>
                  )}
                </CCardBody>
              </CCard>

              {/* Available users */}
              <CCard>
                <CCardHeader>
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span>Available Users (unassigned)</span>
                    <CInputGroup style={{ maxWidth: 240 }}>
                      <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                      <CFormInput
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="sm"
                      />
                    </CInputGroup>
                  </div>
                </CCardHeader>
                <CCardBody className="p-0">
                  <CTable hover responsive className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Username</CTableHeaderCell>
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Role</CTableHeaderCell>
                        <CTableHeaderCell>SIP</CTableHeaderCell>
                        <CTableHeaderCell></CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {availableUsers.map((u) => (
                        <CTableRow key={u.id}>
                          <CTableDataCell className="fw-semibold">{u.username}</CTableDataCell>
                          <CTableDataCell>
                            {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={ROLE_COLORS[u.userType] ?? 'secondary'}>
                              {ROLE_LABELS[u.userType] ?? u.userType}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-muted">{u.sipNo || '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton
                              size="sm" color="primary" variant="outline"
                              onClick={() => assign(u.id)}
                              disabled={saving === u.id}
                            >
                              {saving === u.id
                                ? <CSpinner size="sm" />
                                : <><CIcon icon={cilPlus} className="me-1" />Assign</>}
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                      {!availableUsers.length && (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center text-muted py-3">
                            No available users
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </CCardBody>
              </CCard>
            </>
          )}
        </div>
      </div>
    </>
  )
}
