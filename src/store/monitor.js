import { create } from 'zustand'

const useMonitorStore = create((set, get) => ({
  agents:    {},
  calls:     {},
  queues:    {},
  connected: false,
  lastUpdate: 0,

  applySnapshot(snap) {
    set({
      agents:    snap.agents  || {},
      calls:     snap.calls   || {},
      queues:    snap.queues  || {},
      lastUpdate: Date.now(),
    })
  },

  setConnected(v) { set({ connected: v }) },

  onlineCount()  { return Object.values(get().agents).filter(a => a.status !== 'offline').length },
  activeCallCount() { return Object.keys(get().calls).length },
  waitingCount() { return Object.values(get().queues).reduce((s, q) => s + (q.waiting || 0), 0) },
}))

export default useMonitorStore
