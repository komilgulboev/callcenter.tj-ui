import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'

export default function Page500() {
  const navigate = useNavigate()
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex align-items-center">
      <CContainer>
        <CRow className="justify-content-center text-center">
          <CCol md={6}>
            <h1 className="display-1 fw-bold text-danger">500</h1>
            <h4>Server Error</h4>
            <p className="text-muted">Something went wrong on our end.</p>
            <CButton color="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</CButton>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}
