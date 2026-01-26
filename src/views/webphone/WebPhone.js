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
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const [incoming, setIncoming] = useState(null)
  const [state, setState] = useState('idle')
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
      onStateChange: (s) => {
        setState(s)
        if (s !== 'ringing') setIncoming(null)
      },
    })

    sipService.connect()
  }, [])

  return (
    <CCard>
      <CCardBody>
        <h3>Web Phone</h3>

        {status === 'connecting' && (
          <CAlert color="info">
            <CSpinner size="sm" className="me-2" />
            Connecting…
          </CAlert>
        )}

        {status === 'connected' && (
          <CAlert color="success">Connected</CAlert>
        )}

        {status === 'error' && (
          <CAlert color="danger">
            {error}
            <div className="mt-2">
              <CButton size="sm" onClick={() => sipService.connect()}>
                Reconnect
              </CButton>
            </div>
          </CAlert>
        )}

        {/* OUTGOING */}
        {state === 'idle' && status === 'connected' && (
          <CInputGroup className="mt-3">
            <CFormInput
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <CButton onClick={() => sipService.call(number)}>
              Call
            </CButton>
          </CInputGroup>
        )}

        {/* INCOMING */}
        {incoming && (
          <CAlert color="warning" className="mt-3">
            Incoming from <strong>{incoming.from}</strong>
            <div className="mt-2">
              <CButton onClick={() => sipService.answer()} className="me-2">
                Answer
              </CButton>
              <CButton color="danger" onClick={() => sipService.hangup()}>
                Reject
              </CButton>
            </div>
          </CAlert>
        )}

        {/* IN CALL */}
        {state !== 'idle' && state !== 'ringing' && (
          <CAlert color="success" className="mt-3">
            State: <strong>{state}</strong>
            <div className="mt-2 d-flex gap-2">
              <CButton size="sm" onClick={() => sipService.mute()}>
                Mute
              </CButton>
              <CButton size="sm" onClick={() => sipService.unmute()}>
                Unmute
              </CButton>
              <CButton size="sm" onClick={() => sipService.hold()}>
                Hold
              </CButton>
              <CButton size="sm" onClick={() => sipService.unhold()}>
                Unhold
              </CButton>
              <CButton size="sm" color="danger" onClick={() => sipService.hangup()}>
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
