import React, { useEffect, useState } from 'react'
import {
  CButton, CCard, CCardBody, CModal, CModalBody, CModalFooter,
  CModalHeader, CModalTitle, CForm, CFormInput, CFormLabel,
  CFormSelect, CFormCheck, CTable, CTableBody, CTableDataCell,
  CTableHead, CTableHeaderCell, CTableRow, CBadge, CAlert,
  CSpinner, CInputGroup, CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSearch, cilCheckCircle, cilBan } from '@coreui/icons'
import { whitelist as whitelistApi, tenants as tenantsApi } from 'src/api'
import useAuthStore from 'src/store/auth'

const EMPTY = { phone: '', description: '', active: true }

export default function Whitelist() {
  const { user, isSuperAdmin } = useAuthStore()
  const superAdmin = isSuperAdmin()

  const [rows,         setRows]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [modal,        setModal]        = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)
  const [search,       setSearch]       = useState('')
  const [tenantsList,  setTenantsList]  = useState([])
  const [selectedTid,  setSelectedTid]  = useState(superAdmin ? '' : String(user?.tenantId ?? ''))

  const tid = selectedTid

  useEffect(() => {
    if (!superAdmin) return
    tenantsApi.list()
      .then(d => {
        const list = d.tenants ?? []
        setTenantsList(list)
        if (list.length > 0 && !tid) setSelectedTid(String(list[0].id))
      })
      .catch(() => {})
  }, [])

  const load = () => {
    if (!tid) return
    setLoading(true)
    whitelistApi.list(tid, search)
      .then(d => setRows(d.entries ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tid])

  const handleSearch = (e) => { e.preventDefault(); load() }

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit   = (e) => {
    setEditing(e)
    setForm({ phone: e.phone, description: e.description, active: e.active })
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) await whitelistApi.update(tid, editing.id, form)
      else         await whitelistApi.create(tid, form)
      setModal(false)
      load()
    } catch (e) {
      if (e.message === 'phone_exists') setError('Этот номер уже есть в белом списке')
      else setError(e.message)
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить номер из белого списка?')) return
    try { await whitelistApi.remove(tid, id); load() }
    catch (e) { setError(e.message) }
  }

  const handleToggle = async (id) => {
    try { await whitelistApi.toggle(tid, id); load() }
    catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">Белый список</h4>
          <div className="text-muted small mt-1">Разрешённые номера телефонов</div>
        </div>
        <CButton color="primary" onClick={openCreate} disabled={!tid}>
          <CIcon icon={cilPlus} className="me-2" />Добавить номер
        </CButton>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}

      {superAdmin && (
        <div className="mb-3" style={{ maxWidth: 340 }}>
          <CFormLabel>Тенант</CFormLabel>
          <CFormSelect value={tid} onChange={e => setSelectedTid(e.target.value)}>
            <option value="">— выберите тенант —</option>
            {tenantsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </CFormSelect>
        </div>
      )}

      {/* Поиск */}
      <div className="mb-3">
        <form onSubmit={handleSearch} className="d-flex gap-2">
          <CInputGroup style={{ maxWidth: 360 }}>
            <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
            <CFormInput
              placeholder="Поиск по номеру или описанию…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </CInputGroup>
          <CButton type="submit" color="light">Найти</CButton>
          {search && (
            <CButton color="light" onClick={() => { setSearch(''); setTimeout(load, 0) }}>✕</CButton>
          )}
        </form>
      </div>

      <CCard>
        <CCardBody className="p-0">
          {!tid ? (
            <div className="text-center text-muted py-5">Выберите тенант</div>
          ) : loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Номер телефона</CTableHeaderCell>
                  <CTableHeaderCell>Описание</CTableHeaderCell>
                  <CTableHeaderCell>Статус</CTableHeaderCell>
                  <CTableHeaderCell>Добавлен</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Действия</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map(e => (
                  <CTableRow key={e.id}>
                    <CTableDataCell className="text-muted">{e.id}</CTableDataCell>
                    <CTableDataCell className="fw-semibold font-monospace">{e.phone}</CTableDataCell>
                    <CTableDataCell className="text-muted">{e.description || '—'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={e.active ? 'success' : 'secondary'}>
                        {e.active ? 'Активен' : 'Отключён'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-muted small">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <CButton size="sm" color="light" onClick={() => openEdit(e)} title="Редактировать">
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          size="sm"
                          color={e.active ? 'warning' : 'success'}
                          onClick={() => handleToggle(e.id)}
                          title={e.active ? 'Отключить' : 'Включить'}
                        >
                          <CIcon icon={e.active ? cilBan : cilCheckCircle} />
                        </CButton>
                        <CButton size="sm" color="danger" onClick={() => handleDelete(e.id)} title="Удалить">
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {!rows.length && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-muted py-4">
                      {search ? 'Ничего не найдено' : 'Белый список пуст — добавьте первый номер'}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Итого */}
      {rows.length > 0 && (
        <div className="text-muted small mt-2 text-end">
          Всего: {rows.length} · Активных: {rows.filter(r => r.active).length}
        </div>
      )}

      {/* Модалка создания/редактирования */}
      <CModal visible={modal} onClose={() => setModal(false)}>
        <CModalHeader>
          <CModalTitle>{editing ? 'Редактировать номер' : 'Добавить номер'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div>
              <CFormLabel>Номер телефона <span className="text-danger">*</span></CFormLabel>
              <CFormInput
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+992XXXXXXXXX"
                autoFocus
              />
              <div className="text-muted small mt-1">Можно указать полный номер или маску (+992700)</div>
            </div>
            <div>
              <CFormLabel>Описание</CFormLabel>
              <CFormInput
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Например: Клиент Иванов, VIP"
              />
            </div>
            <CFormCheck
              label="Активен"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModal(false)}>Отмена</CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving || !form.phone}>
            {saving ? <CSpinner size="sm" /> : 'Сохранить'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
