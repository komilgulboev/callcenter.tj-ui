import React, { useEffect, useState } from 'react'
import {
  CButton, CCard, CCardBody, CModal, CModalBody, CModalFooter,
  CModalHeader, CModalTitle, CForm, CFormInput, CFormLabel,
  CFormSelect, CFormCheck, CTable, CTableBody, CTableDataCell,
  CTableHead, CTableHeaderCell, CTableRow, CBadge, CAlert, CSpinner,
  CButtonGroup,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { topics as topicsApi, tenants as tenantsApi } from 'src/api'
import useAuthStore from 'src/store/auth'

const LANGS = ['ru', 'tj', 'en']
const LANG_LABEL = { ru: 'RU', tj: 'TJ', en: 'EN' }
const LANG_PLACEHOLDER = {
  ru: { label: 'Название (русский)', placeholder: 'Название на русском' },
  tj: { label: 'Ном (тоҷикӣ)',       placeholder: 'Номи тоҷикӣ' },
  en: { label: 'Name (English)',     placeholder: 'English name' },
}
const EMPTY_NAMES = { ru: '', tj: '', en: '' }

export function topicName(topic, lang) {
  if (!topic?.names) return '—'
  return topic.names[lang] || topic.names.ru || topic.names.tj || topic.names.en || '—'
}

export default function Topics() {
  const { user, isSuperAdmin } = useAuthStore()
  const superAdmin = isSuperAdmin()

  const [tenantsList,     setTenantsList]     = useState([])
  const [selectedTenant,  setSelectedTenant]  = useState(superAdmin ? '' : String(user?.tenantId ?? ''))
  const [rows,            setRows]            = useState([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [modal,           setModal]           = useState(false)
  const [editing,         setEditing]         = useState(null)
  const [form,            setForm]            = useState({ names: { ...EMPTY_NAMES }, active: true })
  const [saving,          setSaving]          = useState(false)
  const [lang,            setLang]            = useState(localStorage.getItem('ui-lang') || 'ru')

  useEffect(() => {
    if (!superAdmin) return
    tenantsApi.list()
      .then((d) => {
        const list = d.tenants ?? d
        setTenantsList(list)
        if (list.length > 0 && !selectedTenant) setSelectedTenant(String(list[0].id))
      })
      .catch((e) => setError(e.message))
  }, [])

  const tenantId = superAdmin ? selectedTenant : String(user?.tenantId ?? '')

  const load = () => {
    if (!tenantId) return
    setLoading(true)
    topicsApi.list(tenantId)
      .then((d) => setRows(d.topics ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tenantId])

  const changeLang = (l) => {
    setLang(l)
    localStorage.setItem('ui-lang', l)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ names: { ...EMPTY_NAMES }, active: true })
    setModal(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ names: { ...EMPTY_NAMES, ...t.names }, active: t.active ?? true })
    setModal(true)
  }

  const setName = (l, val) => setForm((f) => ({ ...f, names: { ...f.names, [l]: val } }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) await topicsApi.update(tenantId, editing.id, { names: form.names, active: form.active })
      else         await topicsApi.create(tenantId, { names: form.names, active: form.active })
      setModal(false)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту тему?')) return
    try { await topicsApi.remove(tenantId, id); load() }
    catch (e) { setError(e.message) }
  }

  const hasName = LANGS.some((l) => form.names[l].trim())

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">Каталог тем</h4>
        <div className="d-flex gap-2 align-items-center">
          <CButtonGroup size="sm">
            {LANGS.map((l) => (
              <CButton key={l} color={lang === l ? 'primary' : 'light'} onClick={() => changeLang(l)}>
                {LANG_LABEL[l]}
              </CButton>
            ))}
          </CButtonGroup>
          <CButton color="primary" onClick={openCreate} disabled={!tenantId}>
            <CIcon icon={cilPlus} className="me-2" />Новая тема
          </CButton>
        </div>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      {superAdmin && (
        <div className="mb-3" style={{ maxWidth: 340 }}>
          <CFormLabel>Тенант</CFormLabel>
          <CFormSelect value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
            <option value="">— выберите тенант —</option>
            {tenantsList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </CFormSelect>
        </div>
      )}

      <CCard>
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 60 }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Название ({LANG_LABEL[lang]})</CTableHeaderCell>
                  <CTableHeaderCell>RU</CTableHeaderCell>
                  <CTableHeaderCell>TJ</CTableHeaderCell>
                  <CTableHeaderCell>EN</CTableHeaderCell>
                  <CTableHeaderCell>Статус</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Действия</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((t) => (
                  <CTableRow key={t.id}>
                    <CTableDataCell className="text-muted">{t.id}</CTableDataCell>
                    <CTableDataCell className="fw-semibold">{topicName(t, lang)}</CTableDataCell>
                    <CTableDataCell className="text-muted small">{t.names?.ru || '—'}</CTableDataCell>
                    <CTableDataCell className="text-muted small">{t.names?.tj || '—'}</CTableDataCell>
                    <CTableDataCell className="text-muted small">{t.names?.en || '—'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={t.active ? 'success' : 'secondary'}>
                        {t.active ? 'Активна' : 'Отключена'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <CButton size="sm" color="light" onClick={() => openEdit(t)}>
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton size="sm" color="danger" onClick={() => handleDelete(t.id)}>
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {!rows.length && (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="text-center text-muted py-4">
                      {tenantId ? 'Темы не найдены' : 'Выберите тенант'}
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
          <CModalTitle>{editing ? 'Редактировать тему' : 'Новая тема'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            {LANGS.map((l) => (
              <div key={l}>
                <CFormLabel>{LANG_PLACEHOLDER[l].label}</CFormLabel>
                <CFormInput
                  value={form.names[l]}
                  onChange={(e) => setName(l, e.target.value)}
                  placeholder={LANG_PLACEHOLDER[l].placeholder}
                />
              </div>
            ))}
            <CFormCheck
              label="Активна"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModal(false)}>Отмена</CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving || !hasName}>
            {saving ? <CSpinner size="sm" /> : 'Сохранить'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
