import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CAlert,
  CInputGroup,
  CFormInput,
  CSpinner,
} from '@coreui/react'

import sipService from '../../services/sip.service'

const WebPhone = () => {
  const [status, setStatus] = useState('connecting') // connecting | connected | error
  const [error, setError] = useState(null)
  const [incoming, setIncoming] = useState(null)
  const [inCall, setInCall] = useState(false)
  const [number, setNumber] = useState('918616161')

  useEffect(() => {
    sipService.setListeners({
      onRegistered: () => {
        setStatus('connected')
        setError(null)
      },
      onDisconnected: () => {
        setStatus('error')
        setError('Disconnected from Asterisk')
      },
      onError: (msg) => {
        setStatus('error')
        setError(msg)
      },
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

    // 🔥 AUTO CONNECT
    sipService.connect()
  }, [])

  return (
    <CCard>
      <CCardBody>
        <h3>Web Phone</h3>

        {/* STATUS */}
        {status === 'connecting' && (
          <CAlert color="info">
            <CSpinner size="sm" className="me-2" />
            Connecting to Asterisk…
          </CAlert>
        )}

        {status === 'connected' && (
          <CAlert color="success">Connected to Asterisk</CAlert>
        )}

        {status === 'error' && (
          <CAlert color="danger">
            {error}
            <div className="mt-2">
              <CButton
                size="sm"
                color="light"
                onClick={() => {
                  setStatus('connecting')
                  setError(null)
                  sipService.connect()
                }}
              >
                Reconnect
              </CButton>
            </div>
          </CAlert>
        )}

        {/* OUTGOING */}
        {status === 'connected' && !incoming && !inCall && (
          <CInputGroup className="mt-3">
            <CFormInput
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Enter number"
            />
            <CButton
              color="success"
              onClick={() => sipService.call(number)}
            >
              Call
            </CButton>
          </CInputGroup>
        )}

        {/* INCOMING */}
        {incoming && (
          <CAlert color="warning" className="mt-3">
            Incoming call from <strong>{incoming.from}</strong>
            <div className="mt-2">
              <CButton
                color="success"
                className="me-2"
                onClick={() => sipService.answer()}
              >
                Answer
              </CButton>
              <CButton
                color="danger"
                onClick={() => sipService.hangup()}
              >
                Reject
              </CButton>
            </div>
          </CAlert>
        )}

        {/* ACTIVE CALL */}
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
