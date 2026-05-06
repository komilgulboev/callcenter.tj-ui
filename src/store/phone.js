import { create } from 'zustand'
import JsSIP from 'jssip'

JsSIP.debug.disable('JsSIP:*')

const usePhoneStore = create((set, get) => ({
  ua: null,
  session: null,
  status: 'idle',       // idle | connecting | registered | ringing_in | ringing_out | active | on_hold | failed
  remoteNumber: '',
  callDuration: 0,
  isMuted: false,
  _timer: null,

  // Recent calls during this session
  callHistory: [],

  init({ wsUri, sipUri, password, displayName }) {
    get().destroy()

    const socket = new JsSIP.WebSocketInterface(wsUri)
    const ua = new JsSIP.UA({
      sockets:      [socket],
      uri:          sipUri,
      password,
      display_name: displayName,
      register:     true,
    })

    ua.on('connecting',   () => set({ status: 'connecting' }))
    ua.on('registered',   () => set({ status: 'registered' }))
    ua.on('unregistered', () => set({ status: 'idle' }))
    ua.on('registrationFailed', () => set({ status: 'failed' }))

    ua.on('newRTCSession', ({ session, originator }) => {
      if (originator === 'remote') {
        get()._bindSession(session, 'ringing_in')
      }
    })

    ua.start()
    set({ ua })
  },

  destroy() {
    const { ua, _timer } = get()
    if (_timer) clearInterval(_timer)
    if (ua) try { ua.stop() } catch {}
    set({ ua: null, session: null, status: 'idle', remoteNumber: '', callDuration: 0, _timer: null })
  },

  call(number) {
    const { ua } = get()
    if (!ua) return
    const domain = import.meta.env.VITE_SIP_DOMAIN || 'localhost'
    const session = ua.call(`sip:${number}@${domain}`, {
      mediaConstraints: { audio: true, video: false },
    })
    get()._bindSession(session, 'ringing_out', number)
  },

  answer() {
    const { session } = get()
    if (!session) return
    session.answer({ mediaConstraints: { audio: true, video: false } })
  },

  hangup() {
    const { session } = get()
    if (!session) return
    try { session.terminate() } catch {}
    get()._resetCall()
  },

  toggleMute() {
    const { session, isMuted } = get()
    if (!session) return
    isMuted ? session.unmute() : session.mute()
    set({ isMuted: !isMuted })
  },

  toggleHold() {
    const { session, status } = get()
    if (!session) return
    if (status === 'on_hold') {
      session.unhold(() => set({ status: 'active' }))
    } else {
      session.hold()
      set({ status: 'on_hold' })
    }
  },

  sendDtmf(tone) {
    const { session } = get()
    if (session) session.sendDTMF(tone)
  },

  _bindSession(session, initialStatus, number) {
    const remote = number || session.remote_identity?.uri?.user || '?'
    const startedAt = Date.now()
    set({ session, status: initialStatus, remoteNumber: remote })

    session.on('confirmed', () => {
      const timer = setInterval(
        () => set((s) => ({ callDuration: s.callDuration + 1 })),
        1000,
      )
      set({ status: 'active', _timer: timer })

      session.connection?.addEventListener('track', (e) => {
        const audio = document.getElementById('cx-remote-audio')
        if (audio && e.streams?.[0]) audio.srcObject = e.streams[0]
      })
    })

    const addHistory = (result) => {
      const { remoteNumber, callDuration } = get()
      set((s) => ({
        callHistory: [
          {
            id:       Date.now(),
            number:   remoteNumber,
            duration: callDuration,
            result,
            direction: initialStatus === 'ringing_in' ? 'in' : 'out',
            time:     new Date(startedAt).toLocaleTimeString(),
          },
          ...s.callHistory.slice(0, 49), // keep last 50
        ],
      }))
    }

    session.on('ended',  () => { addHistory('ended');  get()._resetCall() })
    session.on('failed', () => { addHistory('missed'); get()._resetCall() })
  },

  _resetCall() {
    const { _timer } = get()
    if (_timer) clearInterval(_timer)
    set({
      session: null, status: 'registered',
      remoteNumber: '', callDuration: 0,
      isMuted: false, _timer: null,
    })
  },
}))

export default usePhoneStore
