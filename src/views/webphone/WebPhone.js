import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CRow,
  CCol,
} from '@coreui/react'

import { initSip, call, hangup } from '../../services/sip.service'

const WebPhone = () => {
  const [number, setNumber] = useState('')
  const [connected, setConnected] = useState(false)

  const connectSip = () => {
    initSip({
      wsUrl: 'wss://PBX_IP:8089/ws',   // ← заменишь
      sipUser: '1001',                 // ← временно
      sipPassword: '1001',             // ← временно
      domain: 'PBX_IP',
    })
    setConnected(true)
  }

  return (
    <CCard>
      <CCardBody>
        <h3>Web Phone</h3>
        <p className="text-body-secondary">
          Browser-based SIP phone
        </p>

        <CRow className="mb-3">
          <CCol>
            <CButton
              color={connected ? 'secondary' : 'success'}
              onClick={connectSip}
              disabled={connected}
            >
              {connected ? 'SIP Connected' : 'Connect SIP'}
            </CButton>
          </CCol>
        </CRow>

        <hr />

        <CRow className="mb-2">
          <CCol md={6}>
            <CFormInput
              placeholder="Enter number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </CCol>
        </CRow>

        <CRow>
          <CCol>
            <CButton
              color="primary"
              className="me-2"
              onClick={() => call(number)}
              disabled={!connected || !number}
            >
              Call
            </CButton>

            <CButton
              color="danger"
              onClick={hangup}
              disabled={!connected}
            >
              Hangup
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default WebPhone
