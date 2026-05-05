import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  CCard, CCardBody, CButton, CFormInput, CFormSelect,
  CSpinner, CRow, CCol, CFormTextarea,
} from '@coreui/react'
import { useTranslation } from 'react-i18next'
import { getApiUrl, getAuthHeaders } from '../../api'
import { getTokenPayload } from '../../utils/tokenUtils'

// ─── Текущий пользователь из JWT ─────────────────────────────
function getCurrentUser() {
  return getTokenPayload()
}

// ─── API ────────────────────────────────────────────────────
const api = {
  getStaff: async () => {
    const r = await fetch(getApiUrl('/api/staff'), { headers: getAuthHeaders() })
    if (!r.ok) {
      const text = await r.text()
      throw new Error(`HTTP ${r.status}: ${text}`)
    }
    return r.json()
  },

  updateProfile: (id, data) =>
    fetch(getApiUrl('/api/staff/' + id + '/profile'), {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error() }),

  uploadAvatar: (id, file) => {
    const form = new FormData()
    form.append('avatar', file)
    const headers = getAuthHeaders()
    delete headers['Content-Type']
    return fetch(getApiUrl('/api/staff/' + id + '/avatar'), {
      method: 'POST', headers, body: form,
    }).then(r => r.ok ? r.json() : Promise.reject())
  },

  deleteStaff: (id) =>
    fetch(getApiUrl('/api/staff/' + id), {
      method: 'DELETE', headers: getAuthHeaders(),
    }).then(r => { if (!r.ok) throw new Error() }),
}

// ─── AVATAR ──────────────────────────────────────────────────
function Avatar({ member, size = 52, onUpload }) {
  const fileRef = useRef()
  const initials = ((member.firstName?.[0] || '') + (member.lastName?.[0] || '')).toUpperCase()
    || member.username?.[0]?.toUpperCase() || '?'
  const colors = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#0284c7']
  const bg = colors[member.id % colors.length]

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      onClick={() => onUpload && fileRef.current?.click()}
    >
      {member.avatarUrl && (
        <img src={member.avatarUrl} alt=""
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
            cursor: onUpload ? 'pointer' : 'default', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
          onError={e => e.target.style.display = 'none'}
        />
      )}
      <div style={{
        display: 'flex', width: size, height: size, borderRadius: '50%',
        background: bg, color: '#fff', fontWeight: 700,
        fontSize: size * 0.35, alignItems: 'center', justifyContent: 'center',
        cursor: onUpload ? 'pointer' : 'default',
      }}>
        {initials}
      </div>
      {onUpload && (
        <>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%', zIndex: 2,
            background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', opacity: 0, transition: 'opacity .15s', cursor: 'pointer',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <span style={{ fontSize: 18, color: '#fff' }}>📷</span>
          </div>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
        </>
      )}
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────
function StatusDot({ status }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: status === 'enable' ? '#22c55e' : '#e5e7eb', marginRight: 5,
    }} />
  )
}

function lastSeenText(dt, t) {
  if (!dt) return t('never')
  const diff = Date.now() - new Date(dt).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return t('just_now')
  if (m < 60) return `${m} ${t('minutes_ago')}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ${t('hours_ago')}`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d} ${t('days_ago')}`
  return new Date(dt).toLocaleDateString()
}

const lbl = { fontSize: 11, color: '#6c757d', display: 'block', marginBottom: 3, fontWeight: 500 }
const inp = { fontSize: 12 }

// ─── EDIT PANEL ──────────────────────────────────────────────
function StaffEditPanel({ member, onClose, onSaved, onDeleted, isAdmin }) {
  const { t } = useTranslation('staff')
  const [form, setForm] = useState({
    firstName: member.firstName || '',
    lastName:  member.lastName  || '',
    email:     member.email     || '',
    phone:     member.phone     || '',
    address:   member.address   || '',
    position:  member.position  || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(member.avatarUrl || null)
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAvatar = async (file) => {
    setUploading(true)
    try {
      const res = await api.uploadAvatar(member.id, file)
      setAvatarPreview(res.avatarUrl + '?t=' + Date.now())
      onSaved()
    } catch {
      setError(t('upload_error'))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await api.updateProfile(member.id, {
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email    || null,
        phone:     form.phone    || null,
        address:   form.address  || null,
        position:  form.position || null,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      onSaved()
    } catch {
      setError(t('save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await api.deleteStaff(member.id)
      onDeleted()
    } catch {
      setError(t('delete_error'))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const editedMember = { ...member, avatarUrl: avatarPreview, firstName: form.firstName, lastName: form.lastName }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#e8f0fe', padding: '14px 16px', borderRadius: '8px 8px 0 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>✏️ {t('edit_title')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6c757d' }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {/* Аватар */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <Avatar member={editedMember} size={72} onUpload={handleAvatar} />
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <CSpinner size="sm" />
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {form.firstName} {form.lastName}
              <span style={{ color: '#adb5bd', fontWeight: 400 }}> @{member.username}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6c757d', display: 'flex', alignItems: 'center', gap: 8 }}>
              SIP: {member.sipNo || '—'}
              {member.sipNo && <CopyNumber number={member.sipNo} />}
            </div>
            <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 2 }}>{t('upload_hint')}</div>
          </div>
        </div>

        {/* Форма */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>{t('first_name')}</label>
            <CFormInput size="sm" value={form.firstName} onChange={e => set('firstName', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>{t('last_name')}</label>
            <CFormInput size="sm" value={form.lastName} onChange={e => set('lastName', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>{t('email')}</label>
            <CFormInput size="sm" type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>{t('phone')}</label>
            <CFormInput size="sm" value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>{t('position')}</label>
            <CFormInput size="sm" value={form.position} onChange={e => set('position', e.target.value)} style={inp} />
          </div>

        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>{t('address')}</label>
          <CFormTextarea size="sm" value={form.address} onChange={e => set('address', e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} />
        </div>

        {success && <div style={{ background: '#d1e7dd', color: '#0a3622', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>✅ {t('saved')}</div>}
        {error   && <div style={{ background: '#f8d7da', color: '#58151c', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        {/* Удаление — только для admin (userType === 1) */}
        {isAdmin && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f8d7da' }}>
            {!confirmDelete ? (
              <CButton size="sm" color="danger" variant="outline" onClick={handleDelete} style={{ width: '100%', fontSize: 12 }}>
                🗑️ {t('delete')}
              </CButton>
            ) : (
              <div style={{ background: '#fff3cd', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, marginBottom: 8, color: '#664d03' }}>
                  ⚠️ {t('delete_confirm', { name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username })}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <CButton size="sm" color="danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1, fontSize: 12 }}>
                    {deleting ? <CSpinner size="sm" /> : '✅ Да'}
                  </CButton>
                  <CButton size="sm" color="secondary" variant="outline" onClick={() => setConfirmDelete(false)} style={{ flex: 1, fontSize: 12 }}>
                    ✕
                  </CButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e9ecef', flexShrink: 0 }}>
        <CButton size="sm" color="primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
          {saving && <CSpinner size="sm" className="me-2" />}
          {saving ? t('saving') : t('save')}
        </CButton>
      </div>
    </div>
  )
}


// ─── COPY NUMBER ─────────────────────────────────────────────
function CopyNumber({ number, onStop }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    if (onStop) onStop(e)
    navigator.clipboard.writeText(number).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span
      onClick={handleCopy}
      title={'Скопировать ' + number}
      style={{
        cursor: 'pointer', fontWeight: 600, fontSize: 11,
        color: copied ? '#0d6efd' : '#198754',
        background: copied ? '#e8f0fe' : '#f0fdf4',
        borderRadius: 6, padding: '1px 7px',
        border: '1px solid ' + (copied ? '#b6d0fe' : '#bbf7d0'),
        transition: 'all .15s', whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✅ Скопировано' : '📞 ' + number}
    </span>
  )
}

// ─── STAFF CARD ──────────────────────────────────────────────
function StaffCard({ member, selected, onClick, t }) {
  const isSelected = selected?.id === member.id
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username

  return (
    <div onClick={onClick} style={{
      padding: '12px 14px', marginBottom: 6, borderRadius: 10, cursor: 'pointer',
      border: isSelected ? '2px solid #0d6efd' : '1px solid #e9ecef',
      background: isSelected ? '#f0f6ff' : '#fff', transition: 'all .12s',
    }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Avatar member={member} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <StatusDot status={member.status} />
            <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#6c757d', alignItems: 'center' }}>
            <span>@{member.username}</span>
            {member.sipNo && (
              <CopyNumber number={member.sipNo} onStop={e => e.stopPropagation()} />
            )}
            {member.position && <span>💼 {member.position}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 2 }}>
            🕐 {lastSeenText(member.lastSeenAt, t)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {member.email  && <div style={{ fontSize: 11, color: '#6c757d' }}>✉️ {member.email}</div>}
          {member.phone  && <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>📱 {member.phone}</div>}
          {member.number && <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>☎️ {member.number}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function Staff() {
  const { t } = useTranslation('staff')
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.userType === 1

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const data = await api.getStaff()
      setStaff(Array.isArray(data) ? data : [])
      if (selected) {
        const updated = data.find(m => m.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selected?.id]) // eslint-disable-line

  useEffect(() => { load() }, []) // eslint-disable-line

  const filtered = staff.filter(m => {
    const fullName = [m.firstName, m.lastName, m.username].join(' ').toLowerCase()
    const matchSearch = !search ||
      fullName.includes(search.toLowerCase()) ||
      (m.sipNo    || '').includes(search) ||
      (m.position || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.phone    || '').includes(search) ||
      (m.number   || '').includes(search)
    const matchStatus = !statusFilter || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeCount   = staff.filter(m => m.status === 'enable').length
  const inactiveCount = staff.filter(m => m.status !== 'enable').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CRow className="g-3" style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 0, flexWrap: 'nowrap' }}>

        <CCol style={{ height: '100%', paddingLeft: 0, flex: selected ? '0 0 55%' : '0 0 100%', maxWidth: selected ? '55%' : '100%', transition: 'all .2s' }}>
          <CCard style={{ height: '100%', marginBottom: 0 }}>
            <CCardBody style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>👥 {t('title')}</span>
                  <span style={{ fontSize: 11, color: '#22c55e', background: '#f0fdf4', borderRadius: 12, padding: '2px 8px' }}>
                    {activeCount} {t('active')}
                  </span>
                  {inactiveCount > 0 && (
                    <span style={{ fontSize: 11, color: '#9ca3af', background: '#f9fafb', borderRadius: 12, padding: '2px 8px' }}>
                      {inactiveCount} {t('disabled')}
                    </span>
                  )}
                </div>
                {loading && <CSpinner size="sm" color="primary" />}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 13 }}>🔍</span>
                  <CFormInput value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={t('search_placeholder')}
                    style={{ fontSize: 12, paddingLeft: 30 }} size="sm" />
                  {search && (
                    <button onClick={() => setSearch('')}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: 14 }}>✕</button>
                  )}
                </div>
                <CFormSelect size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ flex: '0 0 150px', fontSize: 12 }}>
                  <option value="">{t('all_statuses')}</option>
                  <option value="enable">✅ {t('status_active')}</option>
                  <option value="disable">❌ {t('status_disabled')}</option>
                </CFormSelect>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {loadError && (
                  <div style={{ background: '#f8d7da', color: '#58151c', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12 }}>
                    ❌ {t('load_error')}: <b>{loadError}</b>
                  </div>
                )}
                {!loading && !loadError && filtered.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#adb5bd' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
                    <div style={{ fontSize: 13 }}>{t('not_found')}</div>
                  </div>
                )}
                {filtered.map(m => (
                  <StaffCard key={m.id} member={m} selected={selected} t={t}
                    onClick={() => setSelected(selected?.id === m.id ? null : m)} />
                ))}
              </div>

              {filtered.length > 0 && (
                <div style={{ paddingTop: 10, textAlign: 'center', fontSize: 11, color: '#adb5bd', flexShrink: 0 }}>
                  {t('shown')} {filtered.length} {t('of')} {staff.length}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {selected && (
          <CCol style={{ height: '100%', paddingRight: 0, flex: '0 0 45%', maxWidth: '45%' }}>
            <CCard style={{ height: '100%', marginBottom: 0 }}>
              <CCardBody style={{ height: '100%', overflow: 'hidden', padding: 0 }}>
                <StaffEditPanel
                  key={selected.id}
                  member={selected}
                  isAdmin={isAdmin}
                 
                  onClose={() => setSelected(null)}
                  onSaved={() => load()}
                  onDeleted={() => { setSelected(null); load() }}
                />
              </CCardBody>
            </CCard>
          </CCol>
        )}
      </CRow>
    </div>
  )
}