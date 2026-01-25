import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CAlert,
  CInputGroup,
  CFormInput,
} from '@coreui/react'

import sipService from '../../services/sip.service'

const WebPhone = () => {
  const [connected, setConnected] = useState(false)
  const [incoming, setIncoming] = useState(null)
  const [inCall, setInCall] = useState(false)
  const [number, setNumber] = useState('918616161')

  useEffect(() => {
    sipService.setListeners({
      onRegistered: () => setConnected(true),
      onDisconnected: () => setConnected(false),

      onIncoming: (data) => setIncoming(data),

      onCallStart: () => {
        setIncoming(null)
        setInCall(true)
      },

      onCallEnd: () => {
        setIncoming(null)
        setInCall(false)
      },
    })
  }, [])

  const connect = () => {
    sipService.connect({
      wsUrl: 'ws://172.20.40.3:8088/ws',
      sipUri: 'sip:110001@172.20.40.3',
      password: '110001',
    })
  }

  return (
    <CCard>
      <CCardBody>
        <h3>Web Phone</h3>

        <CAlert color={connected ? 'success' : 'secondary'}>
          {connected ? 'Connected to Asterisk' : 'Disconnected'}
        </CAlert>

        {!connected && (
          <CButton color="primary" onClick={connect}>
            Connect
          </CButton>
        )}

        {connected && !inCall && !incoming && (
          <>
            <CInputGroup className="mt-3">
              <CFormInput
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Enter number"
              />
              <CButton color="success" onClick={() => sipService.call(number)}>
                Call
              </CButton>
            </CInputGroup>

            <p className="mt-2">Waiting for calls…</p>
          </>
        )}

        {incoming && (
          <CAlert color="warning" className="mt-3">
            Incoming call from <strong>{incoming.from}</strong>
            <div className="mt-2">
              <CButton color="success" className="me-2" onClick={() => sipService.answer()}>
                Answer
              </CButton>
              <CButton color="danger" onClick={() => sipService.hangup()}>
                Reject
              </CButton>
            </div>
          </CAlert>
        )}

        {inCall && (
          <CAlert color="success" className="mt-3">
            Call in progress
            <div className="mt-2">
              <CButton color="danger" onClick={() => sipService.hangup()}>
                Hangup
              </CButton>
            </div>
          </CAlert>
        )}
      </CCardBody>
    </CCard>
  )
}

export default WebPhone
