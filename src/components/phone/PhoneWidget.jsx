import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CBadge, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPhone, cilMediaStop, cilMicrophone, cilVolumeOff, cilMediaPause, cilMediaPlay, cilX } from '@coreui/icons'
import usePhoneStore from 'src/store/phone'
import useAuthStore from 'src/store/auth'

const STATUS_COLOR = {
  idle:        'secondary',
  connecting:  'warning',
  registered:  'primary',
  ringing_in:  'warning',
  ringing_out: 'info',
  active:      'success',
  on_hold:     'warning',
  failed:      'danger',
}

function fmtDuration(s) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function PhoneWidget() {
  const [open, setOpen] = useState(false)
  const [dial, setDial] = useState('')
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  const {
    status, remoteNumber, callDuration, isMuted,
    call, answer, hangup, toggleMute, toggleHold, sendDtmf,
  } = usePhoneStore()

  // Auto-open on incoming call
  useEffect(() => {
    if (status === 'ringing_in') setOpen(true)
  }, [status])

  // Don't show on /phone page (it has its own UI)
  if (!user || user.userType === 0) return null
  if (location.pathname === '/phone') return <audio id="cx-remote-audio" autoPlay />

  const inCall   = ['ringing_in', 'ringing_out', 'active', 'on_hold'].includes(status)
  const fabClass = status === 'ringing_in' ? 'ringing' : inCall ? 'active' : 'idle'

  const handleDial = () => {
    if (dial.trim()) { call(dial.trim()); setDial(''); setOpen(true) }
  }
  const handleDtmf = (t) => {
    setDial((d) => d + t)
    if (status === 'active') sendDtmf(t)
  }

  return (
    <div className="phone-widget">
      <audio id="cx-remote-audio" autoPlay />

      <button
        className={`phone-fab ${fabClass}`}
        onClick={() => inCall ? setOpen(true) : navigate('/phone')}
        title={`Phone: ${status}`}
      >
        <CIcon icon={cilPhone} size="lg" style={{ color: '#fff' }} />
      </button>

      <CBadge color={STATUS_COLOR[status] ?? 'secondary'} shape="rounded-pill"
        className="position-absolute" style={{ top: 0, right: 0, fontSize: 9, pointerEvents: 'none' }}>
        {status === 'registered' ? '✓' : status === 'failed' ? '✗' : '…'}
      </CBadge>

      {/* Only show mini panel during active/incoming call */}
      {open && inCall && (
        <div className="phone-panel">
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
            <span className="fw-semibold small">Call in progress</span>
            <CButton size="sm" variant="ghost" onClick={() => setOpen(false)}>
              <CIcon icon={cilX} />
            </CButton>
          </div>

          {status === 'ringing_in' && (
            <div className="p-3 text-center">
              <div style={{ fontSize: 32 }}>📲</div>
              <div className="fw-bold fs-5 my-1">{remoteNumber}</div>
              <div className="d-flex gap-2 justify-content-center mt-2">
                <CButton color="success" onClick={answer}>
                  <CIcon icon={cilPhone} className="me-1" />Answer
                </CButton>
                <CButton color="danger" onClick={hangup}>
                  <CIcon icon={cilMediaStop} className="me-1" />Decline
                </CButton>
              </div>
            </div>
          )}

          {['ringing_out', 'active', 'on_hold'].includes(status) && (
            <div className="p-3 text-center">
              <div className="text-muted small">
                {status === 'ringing_out' ? '⏳ Calling…' : status === 'on_hold' ? '⏸ On Hold' : '🔊 Active'}
              </div>
              <div className="fs-4 fw-bold">{remoteNumber}</div>
              {status === 'active' && <div className="text-muted small mb-2">{fmtDuration(callDuration)}</div>}
              <div className="d-flex gap-2 justify-content-center">
                <CButton color={isMuted ? 'warning' : 'secondary'} size="sm" onClick={toggleMute}>
                  <CIcon icon={isMuted ? cilVolumeOff : cilMicrophone} />
                </CButton>
                <CButton color={status === 'on_hold' ? 'info' : 'secondary'} size="sm" onClick={toggleHold}>
                  <CIcon icon={status === 'on_hold' ? cilMediaPlay : cilMediaPause} />
                </CButton>
                <CButton color="danger" size="sm" onClick={hangup}>
                  <CIcon icon={cilMediaStop} />
                </CButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
