import React from 'react'
import { CCard, CCardBody, CCardHeader, CBadge, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMediaStop, cilMediaPause, cilMediaPlay } from '@coreui/icons'
import { useMonitorSocket } from 'src/hooks/useMonitorSocket'
import { monitor as monitorApi } from 'src/api'

const AGENT_STATUS_COLOR = {
  available: 'success',
  busy:      'danger',
  paused:    'warning',
  ringing:   'info',
  offline:   'secondary',
}

function fmtSecs(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

export default function Monitor() {
  const { agents, calls, queues, connected } = useMonitorSocket()
  const agentList = Object.values(agents)
  const callList  = Object.values(calls)
  const queueList = Object.entries(queues)

  const handleHangup = (channel) => monitorApi.hangup(channel).catch(() => {})
  const handlePause  = (id, paused) => (paused ? monitorApi.unpause(id) : monitorApi.pause(id)).catch(() => {})

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">Live Monitor</h4>
        <CBadge color={connected ? 'success' : 'secondary'}>
          {connected ? '● Live' : '○ Disconnected'}
        </CBadge>
      </div>

      {queueList.length > 0 && (
        <div className="row g-3 mb-4">
          {queueList.map(([name, q]) => (
            <div key={name} className="col-sm-6 col-xl-3">
              <CCard>
                <CCardBody>
                  <div className="fw-semibold">{name}</div>
                  <div className="d-flex gap-3 mt-2 small">
                    <span>⏳ Waiting: <strong>{q.waiting}</strong></span>
                    <span>✅ Completed: <strong>{q.completed ?? 0}</strong></span>
                  </div>
                </CCardBody>
              </CCard>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3">
        <div className="col-xl-6">
          <CCard>
            <CCardHeader>Agents ({agentList.length})</CCardHeader>
            <CCardBody className="p-0">
              <CTable hover responsive className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Agent</CTableHeaderCell>
                    <CTableHeaderCell>SIP</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell></CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {agentList.map((a, i) => (
                    <CTableRow key={i}>
                      <CTableDataCell className="fw-semibold">{a.name || a.sipNo}</CTableDataCell>
                      <CTableDataCell className="text-muted">{a.sipNo}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={AGENT_STATUS_COLOR[a.status] ?? 'secondary'}>{a.status}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{fmtSecs(a.callDuration)}</CTableDataCell>
                      <CTableDataCell>
                        <CButton size="sm" color={a.status === 'paused' ? 'success' : 'warning'}
                          onClick={() => handlePause(a.id, a.status === 'paused')}
                          title={a.status === 'paused' ? 'Resume' : 'Pause'}>
                          <CIcon icon={a.status === 'paused' ? cilMediaPlay : cilMediaPause} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {!agentList.length && (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-center text-muted py-4">
                        {connected ? 'No agents online' : 'Connecting…'}
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </div>

        <div className="col-xl-6">
          <CCard>
            <CCardHeader>Active Calls ({callList.length})</CCardHeader>
            <CCardBody className="p-0">
              <CTable hover responsive className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>From</CTableHeaderCell>
                    <CTableHeaderCell>To</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell></CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {callList.map((c, i) => (
                    <CTableRow key={i}>
                      <CTableDataCell>{c.src || c.callerNum}</CTableDataCell>
                      <CTableDataCell>{c.dst || c.calleeNum}</CTableDataCell>
                      <CTableDataCell>{fmtSecs(c.duration)}</CTableDataCell>
                      <CTableDataCell>
                        <CButton size="sm" color="danger" onClick={() => handleHangup(c.channel)} title="Hangup">
                          <CIcon icon={cilMediaStop} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {!callList.length && (
                    <CTableRow>
                      <CTableDataCell colSpan={4} className="text-center text-muted py-4">No active calls</CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </div>
      </div>
    </>
  )
}
