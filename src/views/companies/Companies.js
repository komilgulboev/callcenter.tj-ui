import React, { useEffect, useState, useCallback } from 'react'
import {
  CCard, CCardBody, CButton, CFormInput, CSpinner,
  CRow, CCol, CBadge, CFormSelect, CFormLabel,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import { getApiUrl, getAuthHeaders } from '../../api'
import { useTranslation } from 'react-i18next'

// ─── API ────────────────────────────────────────────────────
const api = {
  getCompanies: () =>
    fetch(getApiUrl('/api/companies'), { headers: getAuthHeaders() }).then(r => r.json()),

  getUnassigned: () =>
    fetch(getApiUrl('/api/companies/unassigned'), { headers: getAuthHeaders() }).then(r => r.json()),

  getCompanyUsers: (tenantId) =>
    fetch(getApiUrl(`/api/companies/${tenantId}/users`), { headers: getAuthHeaders() }).then(r => r.json()),

  assignUserRaw: (userId, tenantId) =>
    fetch(getApiUrl('/api/companies/assign'), {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ userId, tenantId }),
    }),

  unassignUser: (userId) =>
    fetch(getApiUrl('/api/companies/unassign'), {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    }).then(r => { if (!r.ok) throw new Error() }),

  createCompany: (data) =>
    fetch(getApiUrl('/api/companies'), {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(); return r.json() }),

  updateCompany: (tenantId, data) =>
    fetch(getApiUrl(`/api/companies/${tenantId}`), {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(); return r.json() }),

  toggleStatus: (tenantId) =>
    fetch(getApiUrl(`/api/companies/${tenantId}/status`), {
      method: 'PATCH', headers: getAuthHeaders(),
    }).then(r => { if (!r.ok) throw new Error(); return r.json() }),

  getTariffs: () =>
    fetch(getApiUrl('/api/tariffs'), { headers: getAuthHeaders() }).then(r => r.json()),

  getPending: () =>
    fetch(getApiUrl('/api/users/pending'), { headers: getAuthHeaders() }).then(r => r.json()),

  activateUser: (id) =>
    fetch(getApiUrl(`/api/users/${id}/activate`), {
      method: 'PATCH', headers: getAuthHeaders(),
    }).then(r => { if (!r.ok) throw new Error(); return r.json() }),

  rejectUser: (id) =>
    fetch(getApiUrl(`/api/users/${id}/reject`), {
      method: 'DELETE', headers: getAuthHeaders(),
    }).then(r => { if (!r.ok) throw new Error() }),
}

// ─── COMPANY FORM FIELDS ────────────────────────────────────
function CompanyForm({ form, setForm, tariffs }) {
  const { t } = useTranslation('company')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const lbl = { fontSize: 11, color: '#6c757d', fontWeight: 500, marginBottom: 3 }

  const handleTariffChange = (tariffId) => {
    set('tariffId', tariffId)
    if (tariffId) {
      const t = tariffs.find(t => t.id === parseInt(tariffId))
      if (t && t.maxOperators < 9999) set('maxUsers', t.maxOperators)
    }
  }

  return (
    <CRow className="g-3">
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_name')} *</CFormLabel>
        <CFormInput size="sm" value={form.name} onChange={e => set('name', e.target.value)} placeholder="TCell" />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_business_profile')}</CFormLabel>
        <CFormInput size="sm" value={form.businessProfile || ''} onChange={e => set('businessProfile', e.target.value)} placeholder="ISP, Banking..." />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_representatives')}</CFormLabel>
        <CFormInput size="sm" value={form.representatives || ''} onChange={e => set('representatives', e.target.value)} placeholder="Иванов Иван" />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_rep_contact')}</CFormLabel>
        <CFormInput size="sm" value={form.representativesContact || ''} onChange={e => set('representativesContact', e.target.value)} placeholder="998 90 000 0000" />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_tax_id')}</CFormLabel>
        <CFormInput size="sm" value={form.taxId || ''} onChange={e => set('taxId', e.target.value)} />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_website')}</CFormLabel>
        <CFormInput size="sm" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="www.example.com" />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_company_contact')}</CFormLabel>
        <CFormInput size="sm" value={form.companyContact || ''} onChange={e => set('companyContact', e.target.value)} placeholder="998 90 000 0000" />
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_tariff')}</CFormLabel>
        <CFormSelect size="sm" value={form.tariffId || ''} onChange={e => handleTariffChange(e.target.value)}>
          <option value="">{t('no_tariff')}</option>
          {tariffs.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.maxOperators >= 9999 ? '∞' : t.maxOperators} {t('tariff_ops')} / ${t.monthlyFee}/{t('tariff_month')}
            </option>
          ))}
        </CFormSelect>
      </CCol>
      <CCol md={6}>
        <CFormLabel style={lbl}>{t('field_max_users')}</CFormLabel>
        <CFormInput size="sm" type="number" min={1} value={form.maxUsers || 10} onChange={e => set('maxUsers', e.target.value)} />
      </CCol>
      <CCol md={12}>
        <CFormLabel style={lbl}>{t('field_location')}</CFormLabel>
        <CFormInput size="sm" value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="Душанбе, ул. Рудаки 1" />
      </CCol>
    </CRow>
  )
}

// ─── CREATE MODAL ───────────────────────────────────────────
function CreateCompanyModal({ visible, onClose, onCreated }) {
  const { t } = useTranslation('company')
  const emptyForm = { name: '', businessProfile: '', representatives: '', taxId: '',
    representativesContact: '', website: '', companyContact: '', location: '', maxUsers: 10, tariffId: '' }
  const [form, setForm]     = useState(emptyForm)
  const [tariffs, setTariffs] = useState([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (visible) {
      api.getTariffs().then(t => setTariffs(Array.isArray(t) ? t : [])).catch(() => {})
    }
  }, [visible])

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t('error_name_required')); return }
    setSaving(true); setError(null)
    try {
      await api.createCompany({
        ...form,
        businessProfile:        form.businessProfile        || null,
        representatives:        form.representatives        || null,
        taxId:                  form.taxId                  || null,
        representativesContact: form.representativesContact || null,
        website:                form.website                || null,
        companyContact:         form.companyContact         || null,
        location:               form.location               || null,
        maxUsers:               parseInt(form.maxUsers) || 10,
        tariffId:               form.tariffId ? parseInt(form.tariffId) : null,
      })
      onCreated()
      onClose()
      setForm(emptyForm)
    } catch {
      setError(t('error_create'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader><CModalTitle>🏢 {t('create_title')}</CModalTitle></CModalHeader>
      <CModalBody>
        {error && <div style={{ background: '#f8d7da', color: '#58151c', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <CompanyForm form={form} setForm={setForm} tariffs={tariffs} />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>{t('btn_cancel')}</CButton>
        <CButton color="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-1" /> : null}
          Создать компанию
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ─── EDIT MODAL ─────────────────────────────────────────────
function EditCompanyModal({ company, visible, onClose, onSaved }) {
  const { t } = useTranslation('company')
  const [form, setForm]       = useState({})
  const [tariffs, setTariffs] = useState([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (visible && company) {
      setForm({
        name:                   company.name                   || '',
        businessProfile:        company.businessProfile        || '',
        representatives:        company.representatives        || '',
        taxId:                  company.taxId                  || '',
        representativesContact: company.representativesContact || '',
        website:                company.website                || '',
        companyContact:         company.companyContact         || '',
        location:               company.location               || '',
        maxUsers:               company.maxUsers               || 10,
        tariffId:               company.tariffId               || '',
      })
      api.getTariffs().then(t => setTariffs(Array.isArray(t) ? t : [])).catch(() => {})
    }
  }, [visible, company])

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t('error_name_required')); return }
    setSaving(true); setError(null)
    try {
      await api.updateCompany(company.tenantId, {
        ...form,
        businessProfile:        form.businessProfile        || null,
        representatives:        form.representatives        || null,
        taxId:                  form.taxId                  || null,
        representativesContact: form.representativesContact || null,
        website:                form.website                || null,
        companyContact:         form.companyContact         || null,
        location:               form.location               || null,
        maxUsers:               parseInt(form.maxUsers) || 10,
        tariffId:               form.tariffId ? parseInt(form.tariffId) : null,
      })
      onSaved()
      onClose()
    } catch {
      setError(t('error_save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader><CModalTitle>✏️ {t('edit_title')}: {company?.name}</CModalTitle></CModalHeader>
      <CModalBody>
        {error && <div style={{ background: '#f8d7da', color: '#58151c', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <CompanyForm form={form} setForm={setForm} tariffs={tariffs} />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>{t('btn_cancel')}</CButton>
        <CButton color="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-1" /> : null}
          Сохранить
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ─── PENDING ROW ────────────────────────────────────────────
function PendingRow({ user, onActivate, onReject }) {
  const { t } = useTranslation('company')
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
  const [loading, setLoading] = useState(false)

  const handleActivate = async () => {
    setLoading(true)
    try { await onActivate(user.id) }
    finally { setLoading(false) }
  }

  const handleReject = async () => {
    setLoading(true)
    try { await onReject(user.id) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e9a825', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
        {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{fullName}</div>
        <div style={{ fontSize: 11, color: '#6c757d' }}>
          @{user.username}
          {user.phone && <span style={{ marginLeft: 8 }}>📱 {user.phone}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <CButton size="sm" color="success" disabled={loading} onClick={handleActivate} style={{ fontSize: 12 }}>
          {loading ? <CSpinner size="sm" /> : `✅ ${t('activate')}`}
        </CButton>
        <CButton size="sm" color="danger" variant="outline" disabled={loading} onClick={handleReject} style={{ fontSize: 12 }}>
          ✕ {t('reject')}
        </CButton>
      </div>
    </div>
  )
}

// ─── USER ROW ───────────────────────────────────────────────
function UserRow({ user, onAssign, onUnassign, companies, mode }) {
  const { t } = useTranslation('company')
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
  const [assigning, setAssigning]           = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')

  const handleAssign = async () => {
    if (!selectedCompany) return
    setAssigning(true)
    try { await onAssign(user.id, parseInt(selectedCompany)) }
    finally { setAssigning(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
        {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{fullName}</div>
        <div style={{ fontSize: 11, color: '#6c757d' }}>
          @{user.username}
          {user.phone && <span style={{ marginLeft: 8 }}>📱 {user.phone}</span>}
        </div>
      </div>

      {mode === 'unassigned' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <CFormSelect size="sm" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ fontSize: 12, minWidth: 160 }}>
            <option value="">{t('select_company')}</option>
            {companies.map(c => (
              <option key={c.tenantId} value={c.tenantId}>{c.name}</option>
            ))}
          </CFormSelect>
          <CButton size="sm" color="primary" disabled={!selectedCompany || assigning} onClick={handleAssign} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {assigning ? <CSpinner size="sm" /> : t('assign')}
          </CButton>
        </div>
      )}

      {mode === 'assigned' && (
        <CButton size="sm" color="danger" variant="outline" onClick={() => onUnassign(user.id)} style={{ fontSize: 12 }}>
          ✕ Открепить
        </CButton>
      )}
    </div>
  )
}

// ─── COMPANY CARD ───────────────────────────────────────────
function CompanyCard({ company, selected, onClick, onEdit, onToggle, toggling }) {
  const { t } = useTranslation('company')
  const isSelected = selected?.id === company.id
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', marginBottom: 8, borderRadius: 10, cursor: 'pointer',
        border: isSelected ? '2px solid #0d6efd' : '1px solid #e9ecef',
        background: isSelected ? '#f0f6ff' : '#fff', transition: 'all .12s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>🏢 {company.name}</div>
          <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
            ID: {company.tenantId}
            {company.location && <span style={{ marginLeft: 8 }}>📍 {company.location}</span>}
          </div>
          {company.representatives && (
            <div style={{ fontSize: 11, color: '#6c757d' }}>👤 {company.representatives}</div>
          )}
          {company.tariffName && (
            <div style={{ fontSize: 11, color: '#0d6efd', marginTop: 2 }}>
              📦 {company.tariffName} · {company.tariffMaxOperators >= 9999 ? '∞' : company.tariffMaxOperators} опер.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Кнопка редактирования */}
            <CButton
              size="sm" color="light"
              onClick={e => { e.stopPropagation(); onEdit(company) }}
              style={{ fontSize: 11, padding: '2px 8px' }}
              title="Редактировать"
            >
              ✏️
            </CButton>
            {/* Кнопка активации/деактивации */}
            <CButton
              size="sm"
              color={company.status ? 'warning' : 'success'}
              variant="outline"
              disabled={toggling}
              onClick={e => { e.stopPropagation(); onToggle(company) }}
              style={{ fontSize: 11, padding: '2px 8px', whiteSpace: 'nowrap' }}
              title={company.status ? 'Деактивировать' : 'Активировать'}
            >
              {toggling ? <CSpinner size="sm" /> : company.status ? `⏸ ${t('deactivate')}` : `▶ ${t('activate')}`}
            </CButton>
          </div>
          <CBadge color={company.status ? 'success' : 'secondary'} style={{ fontSize: 10 }}>
            {company.status ? t('active') : t('inactive')}
          </CBadge>
          <div style={{ fontSize: 12, color: '#495057', fontWeight: 600 }}>
            👥 {company.userCount}
            {company.tariffMaxOperators && company.tariffMaxOperators < 9999
              ? <span style={{ color: '#adb5bd', fontWeight: 400 }}>/{company.tariffMaxOperators}</span>
              : null
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────
export default function Companies() {
  const { t } = useTranslation('company')
  const [companies, setCompanies]       = useState([])
  const [unassigned, setUnassigned]     = useState([])
  const [companyUsers, setCompanyUsers] = useState([])
  const [selected, setSelected]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [tab, setTab]                   = useState('companies')
  const [showCreate, setShowCreate]     = useState(false)
  const [editCompany, setEditCompany]   = useState(null)
  const [assignError, setAssignError]   = useState(null)
  const [togglingId, setTogglingId]     = useState(null)
  const [pending, setPending]           = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [comp, unas, pend] = await Promise.all([api.getCompanies(), api.getUnassigned(), api.getPending()])
      setCompanies(Array.isArray(comp) ? comp : [])
      setUnassigned(Array.isArray(unas) ? unas : [])
      setPending(Array.isArray(pend) ? pend : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const loadCompanyUsers = async (company) => {
    setSelected(company)
    try {
      const users = await api.getCompanyUsers(company.tenantId)
      setCompanyUsers(Array.isArray(users) ? users : [])
    } catch { setCompanyUsers([]) }
  }

  const handleAssign = async (userId, tenantId) => {
    setAssignError(null)
    const res = await api.assignUserRaw(userId, tenantId)
    if (res.status === 402) {
      const data = await res.json()
      setAssignError(`⛔ ${data.message} (${data.current}/${data.maxAllowed} операторов)`)
      return
    }
    if (!res.ok) { setAssignError(t('error_assign')); return }
    await load()
    if (selected) {
      const updated = await api.getCompanyUsers(selected.tenantId)
      setCompanyUsers(Array.isArray(updated) ? updated : [])
    }
  }

  const handleUnassign = async (userId) => {
    await api.unassignUser(userId)
    await load()
    if (selected) {
      const updated = await api.getCompanyUsers(selected.tenantId)
      setCompanyUsers(Array.isArray(updated) ? updated : [])
    }
  }

  const handleActivate = async (userId) => {
    await api.activateUser(userId)
    await load()
  }

  const handleReject = async (userId) => {
    await api.rejectUser(userId)
    await load()
  }

  const handleToggle = async (company) => {
    setTogglingId(company.id)
    try {
      await api.toggleStatus(company.tenantId)
      await load()
      // Обновляем selected если это та же компания
      if (selected?.id === company.id) {
        const updated = companies.find(c => c.id === company.id)
        if (updated) setSelected({ ...updated, status: !updated.status })
      }
    } catch { } finally { setTogglingId(null) }
  }

  const handleEditSaved = async () => {
    await load()
    if (selected) {
      const updated = await api.getCompanyUsers(selected.tenantId)
      setCompanyUsers(Array.isArray(updated) ? updated : [])
    }
  }

  const filteredCompanies = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || String(c.tenantId).includes(search)
  )

  const filteredUnassigned = unassigned.filter(u =>
    !search ||
    (u.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.lastName  || '').toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CreateCompanyModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
      <EditCompanyModal company={editCompany} visible={!!editCompany} onClose={() => setEditCompany(null)} onSaved={handleEditSaved} />

      <CRow className="g-3" style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 0, flexWrap: 'nowrap' }}>

        {/* ── Левая панель ── */}
        <CCol style={{ height: '100%', paddingLeft: 0, flex: selected ? '0 0 45%' : '0 0 100%', maxWidth: selected ? '45%' : '100%', transition: 'all .2s' }}>
          <CCard style={{ height: '100%', marginBottom: 0 }}>
            <CCardBody style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>🏢 {t('title')}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {loading && <CSpinner size="sm" color="primary" />}
                  <CButton size="sm" color="primary" onClick={() => setShowCreate(true)} style={{ fontSize: 12 }}>
                    + {t('new_company')}
                  </CButton>
                </div>
              </div>

              {/* Табы */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
                <CButton size="sm" color={tab === 'companies' ? 'primary' : 'light'}
                  onClick={() => { setTab('companies'); setSearch('') }} style={{ fontSize: 12 }}>
                  🏢 {t('tab_companies')} ({companies.length})
                </CButton>
                <CButton size="sm" color={tab === 'unassigned' ? 'warning' : 'light'}
                  onClick={() => { setTab('unassigned'); setSearch(''); setSelected(null) }} style={{ fontSize: 12 }}>
                  👤 {t('tab_unassigned')} ({unassigned.length})
                </CButton>
                <CButton size="sm" color={tab === 'pending' ? 'danger' : 'light'}
                  onClick={() => { setTab('pending'); setSearch(''); setSelected(null) }} style={{ fontSize: 12, position: 'relative' }}>
                  ⏳ {t('tab_pending')} {pending.length > 0 && <CBadge color="danger" style={{ fontSize: 9, marginLeft: 4 }}>{pending.length}</CBadge>}
                </CButton>
              </div>

              {/* Ошибка лимита */}
              {assignError && (
                <div style={{ background: '#fff3cd', color: '#664d03', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 8, flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
                  {assignError}
                  <span style={{ cursor: 'pointer' }} onClick={() => setAssignError(null)}>✕</span>
                </div>
              )}

              {/* Поиск */}
              <div style={{ position: 'relative', marginBottom: 12, flexShrink: 0 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 13 }}>🔍</span>
                <CFormInput value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={tab === 'companies' ? t('search_company') : t('search_user')}
                  style={{ fontSize: 12, paddingLeft: 30 }} size="sm" />
              </div>

              {/* Список */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {tab === 'companies' && filteredCompanies.map(c => (
                  <CompanyCard
                    key={c.id}
                    company={c}
                    selected={selected}
                    onClick={() => selected?.id === c.id ? setSelected(null) : loadCompanyUsers(c)}
                    onEdit={setEditCompany}
                    onToggle={handleToggle}
                    toggling={togglingId === c.id}
                  />
                ))}

                {tab === 'unassigned' && (
                  filteredUnassigned.length === 0
                    ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#adb5bd' }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                        <div style={{ fontSize: 13 }}>{t('all_assigned')}</div>
                      </div>
                    )
                    : filteredUnassigned.map(u => (
                      <UserRow key={u.id} user={u} companies={companies} mode="unassigned"
                        onAssign={handleAssign} onUnassign={handleUnassign} />
                    ))
                )}

                {tab === 'pending' && (
                  pending.length === 0
                    ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#adb5bd' }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                        <div style={{ fontSize: 13 }}>{t('no_pending')}</div>
                      </div>
                    )
                    : pending.map(u => (
                      <PendingRow key={u.id} user={u} onActivate={handleActivate} onReject={handleReject} />
                    ))
                )}
              </div>

              <div style={{ paddingTop: 8, textAlign: 'center', fontSize: 11, color: '#adb5bd', flexShrink: 0 }}>
                {tab === 'companies' ? `${filteredCompanies.length} ${t('tab_companies').toLowerCase()}` : tab === 'unassigned' ? `${filteredUnassigned.length} ${t('tab_unassigned').toLowerCase()}` : `${pending.length} ${t('tab_pending').toLowerCase()}`}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* ── Правая панель: сотрудники компании ── */}
        {selected && (
          <CCol style={{ height: '100%', paddingRight: 0, flex: '0 0 55%', maxWidth: '55%' }}>
            <CCard style={{ height: '100%', marginBottom: 0 }}>
              <CCardBody style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}>

                <div style={{ background: '#e8f0fe', padding: '14px 16px', borderRadius: '8px 8px 0 0', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>🏢 {selected.name}</span>
                      <span style={{ fontSize: 11, color: '#6c757d', marginLeft: 8 }}>ID: {selected.tenantId}</span>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6c757d' }}>✕</button>
                  </div>
                  {selected.location && <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>📍 {selected.location}</div>}
                  {selected.tariffName && (
                    <div style={{ fontSize: 11, color: '#0d6efd', marginTop: 2 }}>
                      📦 {selected.tariffName} · {selected.tariffMaxOperators >= 9999 ? '∞' : selected.tariffMaxOperators} опер.
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {companyUsers.length === 0
                    ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#adb5bd' }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
                        <div style={{ fontSize: 13 }}>{t('no_staff')}</div>
                      </div>
                    )
                    : companyUsers.map(u => (
                      <UserRow key={u.id} user={u} companies={companies} mode="assigned"
                        onAssign={handleAssign} onUnassign={handleUnassign} />
                    ))
                  }
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid #e9ecef', flexShrink: 0, fontSize: 11, color: '#6c757d' }}>
                  👥 {companyUsers.length} {t('staff_count')}
                  {selected.tariffMaxOperators && selected.tariffMaxOperators < 9999
                    ? ` / ${selected.tariffMaxOperators} ${t('by_tariff')}`
                    : ''
                  }
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        )}
      </CRow>
    </div>
  )
}
