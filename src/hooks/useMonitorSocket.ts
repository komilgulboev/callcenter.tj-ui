import { useEffect, useRef, useCallback } from 'react'
import { monitor as monitorApi } from '../api'
import { useMonitorStore } from '../store'
import type { MonitorSnapshot } from '../types'

const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_DELAY_MS = 30_000

export function useMonitorSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(RECONNECT_DELAY_MS)
  const unmounted = useRef(false)

  const { applySnapshot, setConnected } = useMonitorStore()

  const connect = useCallback(() => {
    if (unmounted.current) return

    const url = monitorApi.wsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectDelay.current = RECONNECT_DELAY_MS
      setConnected(true)
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as MonitorSnapshot
        if (data.type === 'snapshot') {
          applySnapshot(data)
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      setConnected(false)
      if (unmounted.current) return

      reconnectTimer.current = setTimeout(() => {
        connect()
      }, reconnectDelay.current)

      // Exponential backoff
      reconnectDelay.current = Math.min(
        reconnectDelay.current * 2,
        MAX_RECONNECT_DELAY_MS,
      )
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [applySnapshot, setConnected])

  // Загружаем имена агентов при монтировании
  useEffect(() => {
    const { setAgentNames } = useMonitorStore.getState()
    import('../api').then(({ monitor: monApi }) => {
      monApi.getAgentsInfo().then((data) => {
        const names: Record<string, string> = {}
        for (const agent of data.agents) {
          if (agent.sipNo) {
            const display = [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim()
            names[agent.sipNo] = display || agent.sipNo
          }
        }
        setAgentNames(names)
      }).catch(() => {})
    })
  }, [])

  useEffect(() => {
    unmounted.current = false
    connect()

    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  // Возвращаем состояние из store — компоненты подписываются сами
  return useMonitorStore()
}
