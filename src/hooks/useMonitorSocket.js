import { useEffect, useRef } from 'react'
import { monitor as monitorApi } from 'src/api'
import useMonitorStore from 'src/store/monitor'

const MAX_DELAY = 30_000

export function useMonitorSocket() {
  const wsRef      = useRef(null)
  const timerRef   = useRef(null)
  const delayRef   = useRef(3000)
  const stopped    = useRef(false)
  const { applySnapshot, setConnected } = useMonitorStore()

  useEffect(() => {
    stopped.current = false

    function connect() {
      if (stopped.current) return
      const ws = new WebSocket(monitorApi.wsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        delayRef.current = 3000
        setConnected(true)
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'snapshot') applySnapshot(data)
        } catch {}
      }

      ws.onclose = () => {
        setConnected(false)
        if (stopped.current) return
        timerRef.current = setTimeout(() => {
          delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY)
          connect()
        }, delayRef.current)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      stopped.current = true
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [])

  return useMonitorStore()
}
