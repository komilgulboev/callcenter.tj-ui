import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

const MonitorContext = createContext({
  agents: {},
})

export const MonitorProvider = ({ children }) => {
  const [agents, setAgents] = useState({})
  const wsRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const wsUrl = `ws://localhost:8080/ws/monitor?token=${token}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[WS] monitor connected')
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      setAgents((prev) => ({
        ...prev,
        [msg.extension]: msg,
      }))
    }

    ws.onclose = () => {
      console.warn('[WS] monitor disconnected')
    }

    ws.onerror = (e) => {
      console.error('[WS] error', e)
    }

    ws.onmessage = (event) => {
  console.log('[WS] raw message:', event.data)
}

    wsRef.current = ws
    return () => ws.close()
  }, [])

  return (
    <MonitorContext.Provider value={{ agents }}>
      {children}
    </MonitorContext.Provider>
  )
}

export const useMonitor = () => {
  const ctx = useContext(MonitorContext)
  if (!ctx) {
    throw new Error('useMonitor must be used inside MonitorProvider')
  }
  return ctx
}
