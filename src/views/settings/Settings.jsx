import React, { useState } from 'react'
import {
  CCard, CCardBody, CCardHeader, CForm, CFormInput,
  CFormLabel, CButton, CAlert, CSpinner,
} from '@coreui/react'
import useAuthStore from 'src/store/auth'
import { users as usersApi } from 'src/api'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const [pwd,     setPwd]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [saving,  setSaving]  = useState(false)

  const handleChangePwd = async (e) => {
    e.preventDefault()
    if (pwd !== confirm) { setError('Passwords do not match'); return }
    if (pwd.length < 6)  { setError('Password must be at least 6 characters'); return }
    setSaving(true)
    setError('')
    try {
      await usersApi.resetPwd(user.id, pwd)
      setSuccess('Password updated successfully')
      setPwd('')
      setConfirm('')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <h4 className="mb-4">Settings</h4>

      <CCard style={{ maxWidth: 480 }}>
        <CCardHeader>Change Password</CCardHeader>
        <CCardBody>
          {error   && <CAlert color="danger"  dismissible onClose={() => setError('')}>{error}</CAlert>}
          {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}
          <CForm onSubmit={handleChangePwd} className="d-flex flex-column gap-3">
            <div>
              <CFormLabel>New Password</CFormLabel>
              <CFormInput type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
            </div>
            <div>
              <CFormLabel>Confirm Password</CFormLabel>
              <CFormInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <CButton type="submit" color="primary" disabled={saving}>
              {saving ? <CSpinner size="sm" /> : 'Update Password'}
            </CButton>
          </CForm>
        </CCardBody>
      </CCard>
    </>
  )
}
