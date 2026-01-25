import JsSIP from 'jssip'
import api from './api'

class SipService {
  ua = null
  currentSession = null
  remoteAudio = null
  connecting = false

  listeners = {
    onRegistered: null,
    onDisconnected: null,
    onIncoming: null,
    onCallStart: null,
    onCallEnd: null,
    onError: null,
  }

  setListeners(listeners) {
    this.listeners = { ...this.listeners, ...listeners }
  }

  /* ===============================
     LOAD SIP CREDENTIALS
     =============================== */
  async getSipCredentials() {
    const res = await api.get('/api/sip/credentials')
    return res.data
  }

  /* ===============================
     CONNECT
     =============================== */
  async connect() {
    if (this.ua || this.connecting) return
    this.connecting = true

    try {
      const creds = await this.getSipCredentials()

      console.log('🔌 SIP connect', creds)

      /* ✅ BUILD sipUri HERE */
      const sipUri = `sip:${creds.sipUser}@${creds.domain}`

      const socket = new JsSIP.WebSocketInterface(creds.wsUrl)

      this.ua = new JsSIP.UA({
        sockets: [socket],
        uri: sipUri,                    // ✅ FIX
        password: creds.sipPassword,    // ✅ FIX
        register: true,
        session_timers: false,
      })

      /* === REGISTRATION === */
      this.ua.on('registered', () => {
        console.log('✅ SIP registered')
        this.connecting = false
        this.listeners.onRegistered?.()
      })

      this.ua.on('registrationFailed', (e) => {
        console.error('❌ Registration failed', e)
        this.cleanupUa()
        this.listeners.onError?.('Registration failed')
      })

      this.ua.on('disconnected', () => {
        console.warn('🔌 WS disconnected')
        this.cleanupUa()
        this.listeners.onDisconnected?.()
      })

      /* === CALL HANDLING === */
      this.ua.on('newRTCSession', (e) => {
        if (this.currentSession) {
          console.warn('⚠️ Ignoring extra session')
          return
        }

        const session = e.session
        this.currentSession = session

        console.log('📞 New RTC session', e.originator)

        /* 🔊 AUDIO */
        this.remoteAudio = document.createElement('audio')
        this.remoteAudio.autoplay = true
        this.remoteAudio.playsInline = true
        this.remoteAudio.volume = 1

        session.on('peerconnection', () => {
          const pc = session.connection
          if (!pc) return

          pc.addEventListener('track', (event) => {
            this.remoteAudio.srcObject = event.streams[0]
            this.remoteAudio.play().catch(() => {})
          })
        })

        if (e.originator === 'remote') {
          this.listeners.onIncoming?.({
            from: session.remote_identity.uri.user,
          })
        }

        session.on('accepted', () => {
          this.listeners.onCallStart?.()
        })

        session.on('ended', () => this.cleanupCall())
        session.on('failed', () => this.cleanupCall())
      })

      this.ua.start()
    } catch (err) {
      console.error('❌ SIP connect error', err)
      this.connecting = false
      this.listeners.onError?.(err.message || 'SIP connect error')
    }
  }

  /* ===============================
     CALL CONTROL
     =============================== */
  call(number) {
    if (!this.ua || this.currentSession) return

    console.log('📲 Calling', number)

    this.ua.call(`sip:${number}`, {
      mediaConstraints: { audio: true, video: false },
    })
  }

  answer() {
    this.currentSession?.answer({
      mediaConstraints: { audio: true, video: false },
    })
  }

  hangup() {
    this.currentSession?.terminate()
    this.cleanupCall()
  }

  /* ===============================
     CLEANUP
     =============================== */
  cleanupCall() {
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null
      this.remoteAudio = null
    }

    this.currentSession = null
    this.listeners.onCallEnd?.()
  }

  cleanupUa() {
    this.ua = null
    this.connecting = false
  }
}

export default new SipService()
