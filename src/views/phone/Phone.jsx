import React, { useState } from 'react'
import {
  CCard, CCardBody, CCardHeader, CBadge, CButton, CRow, CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPhone, cilMediaStop, cilMicrophone, cilVolumeOff,
  cilMediaPause, cilMediaPlay,
} from '@coreui/icons'
import usePhoneStore from 'src/store/phone'
import useAuthStore from 'src/store/auth'

const STATUS_COLOR = {
  idle:        'secondary',
  connecting:  'warning',
  registered:  'success',
  ringing_in:  'warning',
  ringing_out: 'info',
  active:      'success',
  on_hold:     'warning',
  failed:      'danger',
}

const STATUS_LABEL = {
  idle:        'Offline',
  connecting:  'Connecting…',
  registered:  'Ready',
  ringing_in:  'Incoming Call',
  ringing_out: 'Calling…',
  active:      'On Call',
  on_hold:     'On Hold',
  failed:      'Connection Failed',
}

function fmtDuration(s) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const KEYPAD = [
  ['1', ''],   ['2', 'ABC'],  ['3', 'DEF'],
  ['4', 'GHI'],['5', 'JKL'],  ['6', 'MNO'],
  ['7', 'PQR'],['8', 'TUV'],  ['9', 'WXY'],
  ['*', ''],   ['0', '+'],    ['#', ''],
]

export default function Phone() {
  const [dial, setDial] = useState('')
  const user = useAuthStore((s) => s.user)
  const {
    status, remoteNumber, callDuration, isMuted, callHistory,
    call, answer, hangup, toggleMute, toggleHold, sendDtmf,
  } = usePhoneStore()

  const inCall = ['ringing_in', 'ringing_out', 'active', 'on_hold'].includes(status)

  const handleKey = (key) => {
    setDial((d) => d + key)
    if (status === 'active') sendDtmf(key)
  }

  const handleDial = () => {
    if (!dial.trim()) return
    call(dial.trim())
    setDial('')
  }

  const handleBackspace = () => setDial((d) => d.slice(0, -1))

  return (
    <div>
      {/* Hidden audio */}
      <audio id="cx-remote-audio" autoPlay />

      <div className="d-flex align-items-center gap-3 mb-4">
        <h4 className="mb-0">Phone</h4>
        <CBadge color={STATUS_COLOR[status] ?? 'secondary'} className="px-3 py-2">
          {STATUS_LABEL[status] ?? status}
        </CBadge>
        {user && (
          <span className="text-muted small ms-auto">
            Extension: <strong>{user.username}</strong>
          </span>
        )}
      </div>

      <CRow className="g-3">
        {/* ── Left: softphone ── */}
        <CCol lg={5} xl={4}>

          {/* Incoming call */}
          {status === 'ringing_in' && (
            <CCard className="border-warning mb-3" style={{ animation: 'pulse 1s infinite' }}>
              <CCardBody className="text-center py-4">
                <div style={{ fontSize: 48 }}>📲</div>
                <div className="text-muted mt-1">Incoming call</div>
                <div className="fs-2 fw-bold my-2">{remoteNumber}</div>
                <div className="d-flex gap-3 justify-content-center mt-3">
                  <CButton color="success" size="lg" onClick={answer} className="px-4">
                    <CIcon icon={cilPhone} className="me-2" />Answer
                  </CButton>
                  <CButton color="danger" size="lg" onClick={hangup} className="px-4">
                    <CIcon icon={cilMediaStop} className="me-2" />Decline
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Active call */}
          {['ringing_out', 'active', 'on_hold'].includes(status) && (
            <CCard className={`mb-3 border-${STATUS_COLOR[status]}`}>
              <CCardBody className="text-center py-4">
                <div className="text-muted small">
                  {status === 'ringing_out' ? '⏳ Calling…'
                    : status === 'on_hold'  ? '⏸ On Hold'
                    : '🔊 Active Call'}
                </div>
                <div className="fs-2 fw-bold my-2">{remoteNumber}</div>
                {status === 'active' && (
                  <div className="fs-4 text-muted mb-3">{fmtDuration(callDuration)}</div>
                )}
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                  <CButton
                    color={isMuted ? 'warning' : 'light'}
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    className="px-3"
                  >
                    <CIcon icon={isMuted ? cilVolumeOff : cilMicrophone} />
                    <span className="ms-1 small">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </CButton>
                  <CButton
                    color={status === 'on_hold' ? 'info' : 'light'}
                    onClick={toggleHold}
                    title="Hold"
                    className="px-3"
                  >
                    <CIcon icon={status === 'on_hold' ? cilMediaPlay : cilMediaPause} />
                    <span className="ms-1 small">{status === 'on_hold' ? 'Resume' : 'Hold'}</span>
                  </CButton>
                  <CButton color="danger" onClick={hangup} className="px-3">
                    <CIcon icon={cilMediaStop} />
                    <span className="ms-1 small">Hangup</span>
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Dial pad */}
          <CCard>
            <CCardHeader>Dial</CCardHeader>
            <CCardBody>
              {/* Number display */}
              <div className="input-group mb-3">
                <input
                  className="form-control text-center fs-5 fw-bold"
                  value={inCall ? remoteNumber : dial}
                  onChange={(e) => !inCall && setDial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !inCall && handleDial()}
                  placeholder="Enter number…"
                  readOnly={inCall}
                />
                {!inCall && dial && (
                  <CButton color="light" onClick={handleBackspace}>⌫</CButton>
                )}
              </div>

              {/* Keypad grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {KEYPAD.map(([key, sub]) => (
                  <CButton
                    key={key}
                    color="light"
                    onClick={() => handleKey(key)}
                    className="py-3"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span className="fw-bold fs-5 lh-1">{key}</span>
                    {sub && <span style={{ fontSize: 9, opacity: 0.5, letterSpacing: 1 }}>{sub}</span>}
                  </CButton>
                ))}
              </div>

              {/* Call button */}
              <CButton
                color="success"
                className="w-100 mt-3"
                size="lg"
                onClick={handleDial}
                disabled={!dial.trim() || inCall}
              >
                <CIcon icon={cilPhone} className="me-2" />Call
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        {/* ── Right: call history ── */}
        <CCol lg={7} xl={8}>
          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span>Recent Calls</span>
              <CBadge color="secondary">{callHistory.length}</CBadge>
            </CCardHeader>
            <CCardBody className="p-0">
              {callHistory.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <div style={{ fontSize: 40 }}>📋</div>
                  <div className="mt-2">No calls yet this session</div>
                </div>
              ) : (
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Direction</th>
                      <th>Number</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callHistory.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className={c.direction === 'in' ? 'text-success' : 'text-primary'}>
                            {c.direction === 'in' ? '↙ Inbound' : '↗ Outbound'}
                          </span>
                        </td>
                        <td className="fw-semibold">
                          <span
                            className="cursor-pointer text-primary"
                            onClick={() => !inCall && setDial(c.number)}
                            title="Click to redial"
                          >
                            {c.number}
                          </span>
                        </td>
                        <td className="text-muted">{c.time}</td>
                        <td>{c.duration > 0 ? fmtDuration(c.duration) : '—'}</td>
                        <td>
                          <CBadge color={c.result === 'missed' ? 'danger' : 'success'}>
                            {c.result === 'missed' ? 'Missed' : 'Ended'}
                          </CBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CCardBody>
          </CCard>

          {/* No SIP password warning */}
          {!localStorage.getItem('sipPassword') && (
            <CCard className="mt-3 border-warning">
              <CCardBody className="text-center py-3">
                <div className="text-warning fw-semibold">⚠️ Phone not connected</div>
                <div className="text-muted small mt-1">
                  Please log out and log in again to activate the softphone.
                </div>
              </CCardBody>
            </CCard>
          )}
        </CCol>
      </CRow>
    </div>
  )
}
