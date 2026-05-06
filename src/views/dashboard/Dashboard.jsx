import React, { useEffect, useState } from 'react'
import {
  CCard, CCardBody, CCardTitle, CCol, CRow, CSpinner,
} from '@coreui/react'
import { monitor as monitorApi, tickets, cdr } from 'src/api'
import useMonitorStore from 'src/store/monitor'
import { useMonitorSocket } from 'src/hooks/useMonitorSocket'

function StatCard({ title, value, color, icon }) {
  return (
    <CCard className={`border-top border-top-${color} border-top-3`}>
      <CCardBody>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <div className="fs-2 fw-bold">{value ?? <CSpinner size="sm" />}</div>
            <div className="text-muted small">{title}</div>
          </div>
          <div className={`fs-1 text-${color} opacity-25`}>{icon}</div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default function Dashboard() {
  const { connected, onlineCount, activeCallCount, waitingCount } = useMonitorSocket()
  const [openTickets, setOpenTickets] = useState(null)
  const [todayCalls,  setTodayCalls]  = useState(null)

  useEffect(() => {
    tickets.list({ status: 'open', limit: 1 })
      .then((d) => setOpenTickets(d.total ?? d.length ?? 0))
      .catch(() => setOpenTickets('—'))

    const today = new Date().toISOString().slice(0, 10)
    cdr.list({ date_from: today, limit: 1 })
      .then((d) => setTodayCalls(d.total ?? d.length ?? 0))
      .catch(() => setTodayCalls('—'))
  }, [])

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">Dashboard</h4>
        <span className={`badge bg-${connected ? 'success' : 'secondary'}`}>
          {connected ? '● Live' : '○ Connecting…'}
        </span>
      </div>

      <CRow className="g-3">
        <CCol sm={6} xl={3}>
          <StatCard title="Agents Online"  value={onlineCount()}     color="success" icon="👤" />
        </CCol>
        <CCol sm={6} xl={3}>
          <StatCard title="Active Calls"   value={activeCallCount()} color="primary" icon="📞" />
        </CCol>
        <CCol sm={6} xl={3}>
          <StatCard title="Waiting"        value={waitingCount()}    color="warning" icon="⏳" />
        </CCol>
        <CCol sm={6} xl={3}>
          <StatCard title="Open Tickets"   value={openTickets}       color="danger"  icon="🎫" />
        </CCol>
      </CRow>

      <CRow className="g-3 mt-1">
        <CCol xl={6}>
          <CCard>
            <CCardBody>
              <CCardTitle>Today's Calls</CCardTitle>
              <div className="fs-3 fw-bold">{todayCalls ?? <CSpinner size="sm" />}</div>
              <div className="text-muted small">Total calls today</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xl={6}>
          <CCard>
            <CCardBody>
              <CCardTitle>System Status</CCardTitle>
              <div className="d-flex flex-column gap-2 mt-2">
                <div className="d-flex justify-content-between">
                  <span>Monitor WebSocket</span>
                  <span className={`badge bg-${connected ? 'success' : 'secondary'}`}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>API</span>
                  <span className="badge bg-success">Connected</span>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}
