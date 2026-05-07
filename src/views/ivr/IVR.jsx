import React, { useEffect, useRef, useState } from 'react'
import {
  CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink,
  CTabContent, CTabPane, CButton, CForm, CFormLabel, CFormInput,
  CFormSelect, CRow, CCol, CTable, CTableHead, CTableHeaderCell,
  CTableBody, CTableRow, CTableDataCell, CBadge, CAlert, CSpinner,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus, cilTrash, cilMediaPlay, cilCloudUpload, cilSettings,
  cilPeople, cilListNumbered, cilMusicNote, cilSync,
} from '@coreui/icons'
import { ivr as ivrApi } from 'src/api'
import useAuthStore from 'src/store/auth'

const STRATEGIES = [
  { value: 'ringall',      label: 'Всем сразу (ringall)' },
  { value: 'leastrecent',  label: 'Давно не звонил (leastrecent)' },
  { value: 'fewestcalls',  label: 'Меньше всего звонков (fewestcalls)' },
  { value: 'random',       label: 'Случайный (random)' },
  { value: 'rrmemory',     label: 'По очереди (rrmemory)' },
  { value: 'linear',       label: 'Линейный (linear)' },
]

const ACTIONS = [
  { value: 'queue',     label: 'Направить в очередь' },
  { value: 'extension', label: 'Перевести на номер' },
  { value: 'playback',  label: 'Воспроизвести файл' },
  { value: 'hangup',    label: 'Завершить звонок' },
]

const DIGITS = ['0','1','2','3','4','5','6','7','8','9','*','#']

export default function IVR() {
  const { user, isSuperAdmin } = useAuthStore()
  const superAdmin = isSuperAdmin()

  const [tab,          setTab]          = useState('queue')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [syncing,      setSyncing]      = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  const [tenantId,     setTenantId]     = useState(superAdmin ? '' : String(user?.tenantId ?? ''))
  const [tenantsList,  setTenantsList]  = useState([])

  const [config,   setConfig]   = useState({ strategy: 'ringall', waitTimeout: 5, queueTimeout: 300, maxCallers: 0, mohClass: 'default', didNumber: '' })
  const [options,  setOptions]  = useState([])
  const [members,  setMembers]  = useState([])
  const [availUsers, setAvailUsers] = useState([])

  // Option modal
  const [optModal,  setOptModal]  = useState(false)
  const [optForm,   setOptForm]   = useState({ digit: '1', label: '', action: 'queue', actionData: '', sortOrder: 0 })

  // Greeting upload
  const [uploading,     setUploading]     = useState(false)
  const [greetingInfo,  setGreetingInfo]  = useState('')
  const fileRef = useRef()

  const tid = tenantId

  const load = () => {
    if (!tid) return
    setLoading(true)
    ivrApi.get(tid)
      .then(d => {
        setConfig(d.config)
        setOptions(d.options || [])
        setMembers(d.members || [])
        setGreetingInfo(d.config?.greetingFile || '')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const loadAvailUsers = () => {
    if (!tid) return
    ivrApi.availableUsers(tid)
      .then(d => setAvailUsers(d.users || []))
      .catch(() => {})
  }

  useEffect(() => {
    if (superAdmin) {
      import('src/api').then(m => m.tenants.list())
        .then(d => {
          const list = d.tenants ?? []
          setTenantsList(list)
          if (list.length > 0 && !tid) setTenantId(String(list[0].id))
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => { load(); loadAvailUsers() }, [tid])

  const handleSaveConfig = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await ivrApi.updateConfig(tid, config)
      setSuccess('Настройки сохранены')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleSync = async () => {
    setSyncing(true); setError(''); setSuccess('')
    try {
      const r = await ivrApi.sync(tid)
      setSuccess(`Применено к Asterisk: контекст ${r.context}, очередь ${r.queue}`)
    } catch (e) { setError(e.message) }
    finally { setSyncing(false) }
  }

  const handleUploadGreeting = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const r = await ivrApi.uploadGreeting(tid, file)
      setGreetingInfo(r.asteriskPath)
      setConfig(c => ({ ...c, greetingFile: r.asteriskPath }))
      setSuccess(`Файл загружен: ${r.file}`)
    } catch (e) { setError(e.message) }
    finally { setUploading(false) }
  }

  const openOptModal = (opt = null) => {
    setOptForm(opt
      ? { digit: opt.digit, label: opt.label, action: opt.action, actionData: opt.actionData, sortOrder: opt.sortOrder }
      : { digit: '1', label: '', action: 'queue', actionData: '', sortOrder: options.length }
    )
    setOptModal(true)
  }

  const handleSaveOption = async () => {
    setSaving(true)
    try {
      await ivrApi.saveOption(tid, optForm)
      setOptModal(false)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteOption = async (digit) => {
    if (!confirm(`Удалить опцию "${digit}"?`)) return
    try { await ivrApi.deleteOption(tid, digit); load() }
    catch (e) { setError(e.message) }
  }

  const handleAddMember = async (username) => {
    try {
      await ivrApi.addMember(tid, username)
      load(); loadAvailUsers()
    } catch (e) { setError(e.message) }
  }

  const handleRemoveMember = async (username) => {
    if (!confirm(`Убрать ${username} из очереди?`)) return
    try {
      await ivrApi.removeMember(tid, username)
      load(); loadAvailUsers()
    } catch (e) { setError(e.message) }
  }

  const queueName  = tid ? `queue-tenant-${tid}` : '—'
  const ivrContext = tid ? `ivr-tenant-${tid}` : '—'

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">IVR / Очередь</h4>
          {tid && (
            <div className="text-muted small mt-1">
              Контекст: <code>{ivrContext}</code> · Очередь: <code>{queueName}</code>
            </div>
          )}
        </div>
        <CButton color="success" onClick={handleSync} disabled={syncing || !tid}>
          {syncing
            ? <CSpinner size="sm" className="me-2" />
            : <CIcon icon={cilSync} className="me-2" />}
          Применить к Asterisk
        </CButton>
      </div>

      {error   && <CAlert color="danger"  dismissible onClose={() => setError('')}>{error}</CAlert>}
      {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

      {superAdmin && (
        <div className="mb-3" style={{ maxWidth: 340 }}>
          <CFormLabel>Тенант</CFormLabel>
          <CFormSelect value={tid} onChange={e => setTenantId(e.target.value)}>
            <option value="">— выберите тенант —</option>
            {tenantsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </CFormSelect>
        </div>
      )}

      {!tid ? (
        <CAlert color="info">Выберите тенант для управления IVR</CAlert>
      ) : loading ? (
        <div className="text-center py-5"><CSpinner /></div>
      ) : (
        <CCard>
          <CCardHeader>
            <CNav variant="tabs" className="card-header-tabs">
              {[
                { key: 'queue',    icon: cilSettings,      label: 'Очередь' },
                { key: 'greeting', icon: cilMusicNote,      label: 'Приветствие' },
                { key: 'menu',     icon: cilListNumbered,  label: 'Меню IVR' },
                { key: 'members',  icon: cilPeople,        label: `Операторы (${members.length})` },
              ].map(t => (
                <CNavItem key={t.key}>
                  <CNavLink active={tab === t.key} onClick={() => setTab(t.key)} style={{ cursor: 'pointer' }}>
                    <CIcon icon={t.icon} className="me-1" />{t.label}
                  </CNavLink>
                </CNavItem>
              ))}
            </CNav>
          </CCardHeader>

          <CCardBody>
            <CTabContent>

              {/* ── Очередь ── */}
              <CTabPane visible={tab === 'queue'}>
                <CForm className="d-flex flex-column gap-3" style={{ maxWidth: 520 }}>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel>Стратегия распределения</CFormLabel>
                      <CFormSelect value={config.strategy} onChange={e => setConfig(c => ({ ...c, strategy: e.target.value }))}>
                        {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Макс. ожидающих (0 = без лимита)</CFormLabel>
                      <CFormInput type="number" min="0" value={config.maxCallers}
                        onChange={e => setConfig(c => ({ ...c, maxCallers: +e.target.value }))} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Ожидание нажатия клавиши (сек)</CFormLabel>
                      <CFormInput type="number" min="1" max="30" value={config.waitTimeout}
                        onChange={e => setConfig(c => ({ ...c, waitTimeout: +e.target.value }))} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Макс. время в очереди (сек)</CFormLabel>
                      <CFormInput type="number" min="30" value={config.queueTimeout}
                        onChange={e => setConfig(c => ({ ...c, queueTimeout: +e.target.value }))} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Класс музыки ожидания (MOH)</CFormLabel>
                      <CFormInput value={config.mohClass}
                        onChange={e => setConfig(c => ({ ...c, mohClass: e.target.value }))}
                        placeholder="default" />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>DID номер (входящий)</CFormLabel>
                      <CFormInput value={config.didNumber}
                        onChange={e => setConfig(c => ({ ...c, didNumber: e.target.value }))}
                        placeholder="+992..." />
                    </CCol>
                  </CRow>
                  <div>
                    <CButton color="primary" onClick={handleSaveConfig} disabled={saving}>
                      {saving ? <CSpinner size="sm" className="me-2" /> : null}
                      Сохранить настройки
                    </CButton>
                  </div>
                </CForm>
              </CTabPane>

              {/* ── Приветствие ── */}
              <CTabPane visible={tab === 'greeting'}>
                <div style={{ maxWidth: 520 }}>
                  <div className="mb-4">
                    <CFormLabel className="fw-semibold">Файл приветствия</CFormLabel>
                    <div className="text-muted small mb-2">
                      Воспроизводится когда абонент дозванивается в IVR.
                      Поддерматы: WAV, GSM, MP3, ULAW.
                    </div>
                    {greetingInfo && (
                      <CAlert color="info" className="small py-2 mb-3">
                        Текущий файл Asterisk: <code>{greetingInfo}</code>
                      </CAlert>
                    )}
                    <div className="d-flex gap-2 align-items-center">
                      <CButton color="primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading
                          ? <CSpinner size="sm" className="me-2" />
                          : <CIcon icon={cilCloudUpload} className="me-2" />}
                        {uploading ? 'Загрузка...' : 'Загрузить файл'}
                      </CButton>
                      <input ref={fileRef} type="file" accept=".wav,.gsm,.mp3,.ulaw"
                        className="d-none" onChange={handleUploadGreeting} />
                    </div>
                  </div>

                  <hr />

                  <div className="mt-3">
                    <CFormLabel className="fw-semibold">Музыка ожидания (MOH)</CFormLabel>
                    <div className="text-muted small mb-2">
                      Укажите название класса MOH, настроенного в Asterisk.
                      Файлы размещаются на сервере Asterisk в <code>/var/lib/asterisk/moh/</code>
                    </div>
                    <div className="d-flex gap-2" style={{ maxWidth: 300 }}>
                      <CFormInput value={config.mohClass}
                        onChange={e => setConfig(c => ({ ...c, mohClass: e.target.value }))}
                        placeholder="default" />
                      <CButton color="primary" onClick={handleSaveConfig} disabled={saving}>
                        Сохранить
                      </CButton>
                    </div>
                  </div>
                </div>
              </CTabPane>

              {/* ── Меню IVR ── */}
              <CTabPane visible={tab === 'menu'}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="text-muted small">
                    Настройте что происходит при нажатии каждой клавиши.
                  </div>
                  <CButton color="primary" size="sm" onClick={() => openOptModal()}>
                    <CIcon icon={cilPlus} className="me-1" />Добавить опцию
                  </CButton>
                </div>
                {options.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <div style={{ fontSize: 40 }}>☎️</div>
                    <div className="mt-2">Меню пустое — добавьте опции</div>
                    <div className="small mt-1">После добавления нажмите «Применить к Asterisk»</div>
                  </div>
                ) : (
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Клавиша</CTableHeaderCell>
                        <CTableHeaderCell>Название</CTableHeaderCell>
                        <CTableHeaderCell>Действие</CTableHeaderCell>
                        <CTableHeaderCell>Данные</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Удалить</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {options.map(opt => (
                        <CTableRow key={opt.digit}>
                          <CTableDataCell>
                            <CBadge color="primary" className="fs-6 px-3">{opt.digit}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="fw-semibold">{opt.label}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="secondary">
                              {ACTIONS.find(a => a.value === opt.action)?.label ?? opt.action}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-muted small">
                            {opt.actionData || '—'}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton size="sm" color="danger" onClick={() => handleDeleteOption(opt.digit)}>
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CTabPane>

              {/* ── Операторы ── */}
              <CTabPane visible={tab === 'members'}>
                <CRow className="g-3">
                  {/* Текущие операторы в очереди */}
                  <CCol md={6}>
                    <div className="fw-semibold mb-2">В очереди <code>{queueName}</code></div>
                    {members.length === 0 ? (
                      <div className="text-muted small py-3">Операторов в очереди нет</div>
                    ) : (
                      <CTable hover responsive className="mb-0">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Оператор</CTableHeaderCell>
                            <CTableHeaderCell>Статус</CTableHeaderCell>
                            <CTableHeaderCell></CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {members.map(m => (
                            <CTableRow key={m.username}>
                              <CTableDataCell>
                                <div className="fw-semibold">{m.username}</div>
                                <div className="text-muted small">
                                  {[m.firstName, m.lastName].filter(Boolean).join(' ') || ''}
                                </div>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={m.paused ? 'warning' : 'success'}>
                                  {m.paused ? 'Пауза' : 'Активен'}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="text-end">
                                <CButton size="sm" color="danger" onClick={() => handleRemoveMember(m.username)}>
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )}
                  </CCol>

                  {/* Доступные пользователи тенанта */}
                  <CCol md={6}>
                    <div className="fw-semibold mb-2">Доступные пользователи тенанта</div>
                    {availUsers.length === 0 ? (
                      <div className="text-muted small py-3">Все пользователи уже в очереди</div>
                    ) : (
                      <CTable hover responsive className="mb-0">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Пользователь</CTableHeaderCell>
                            <CTableHeaderCell></CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {availUsers.map(u => (
                            <CTableRow key={u.username}>
                              <CTableDataCell>
                                <div className="fw-semibold">{u.username}</div>
                                <div className="text-muted small">
                                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || ''}
                                </div>
                              </CTableDataCell>
                              <CTableDataCell className="text-end">
                                <CButton size="sm" color="success" onClick={() => handleAddMember(u.username)}>
                                  <CIcon icon={cilPlus} />
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )}
                  </CCol>
                </CRow>
              </CTabPane>

            </CTabContent>
          </CCardBody>
        </CCard>
      )}

      {/* Modal: Add/Edit IVR option */}
      <CModal visible={optModal} onClose={() => setOptModal(false)}>
        <CModalHeader><CModalTitle>Опция меню IVR</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <CRow className="g-2">
              <CCol md={4}>
                <CFormLabel>Клавиша</CFormLabel>
                <CFormSelect value={optForm.digit} onChange={e => setOptForm(f => ({ ...f, digit: e.target.value }))}>
                  {DIGITS.map(d => <option key={d} value={d}>{d}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={8}>
                <CFormLabel>Название опции</CFormLabel>
                <CFormInput value={optForm.label}
                  onChange={e => setOptForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Техническая поддержка" />
              </CCol>
            </CRow>
            <div>
              <CFormLabel>Действие</CFormLabel>
              <CFormSelect value={optForm.action} onChange={e => setOptForm(f => ({ ...f, action: e.target.value }))}>
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </CFormSelect>
            </div>
            {optForm.action !== 'hangup' && (
              <div>
                <CFormLabel>
                  {optForm.action === 'queue'     && 'Название очереди (пусто = очередь тенанта)'}
                  {optForm.action === 'extension' && 'Номер абонента / добавочный'}
                  {optForm.action === 'playback'  && 'Путь к файлу (без расширения)'}
                </CFormLabel>
                <CFormInput value={optForm.actionData}
                  onChange={e => setOptForm(f => ({ ...f, actionData: e.target.value }))}
                  placeholder={
                    optForm.action === 'queue'     ? `queue-tenant-${tid}` :
                    optForm.action === 'extension' ? '1001' : 'sounds/custom-file'
                  }
                />
              </div>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setOptModal(false)}>Отмена</CButton>
          <CButton color="primary" onClick={handleSaveOption} disabled={saving || !optForm.digit}>
            {saving ? <CSpinner size="sm" /> : 'Сохранить'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
