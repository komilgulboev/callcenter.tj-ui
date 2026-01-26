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
     LOAD SIP CREDENTIALS FROM API
     =============================== */
  async loadCredentials() {
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
      const creds = await this.loadCredentials()

      const sipUri = `sip:${creds.sipUser}@${creds.domain}`
      console.log('🔌 Connecting SIP:', sipUri)

      const socket = new JsSIP.WebSocketInterface(creds.wsUrl)

      this.ua = new JsSIP.UA({
        sockets: [socket],
        uri: sipUri,
        password: creds.sipPassword,
        register: true,
        session_timers: false,
      })

      /* ===== REGISTRATION ===== */

      this.ua.on('registered', () => {
        console.log('✅ SIP registered')
        this.connecting = false
        this.listeners.onRegistered?.()
      })

      this.ua.on('registrationFailed', (e) => {
        console.error('❌ Registration failed', e)
        this.cleanupUa()
        this.listeners.onError?.('SIP registration failed')
      })

      this.ua.on('disconnected', () => {
        console.warn('🔌 WS disconnected')
        this.cleanupUa()
        this.listeners.onDisconnected?.()
      })

      /* ===== CALL HANDLING ===== */

      this.ua.on('newRTCSession', (e) => {
        const session = e.session

        // ⛔ HARD PROTECTION FROM LOOPS
        if (this.currentSession) {
          console.warn('⚠ Session already exists, rejecting')
          session.terminate()
          return
        }

        this.currentSession = session
        console.log('📞 New RTC session:', e.originator)

        /* 🔊 AUDIO (WORKING WAY) */
        this.remoteAudio = document.createElement('audio')
        this.remoteAudio.autoplay = true
        this.remoteAudio.playsInline = true
        document.body.appendChild(this.remoteAudio)

        session.connection.addEventListener('track', (event) => {
          console.log('🔊 Remote audio received')
          this.remoteAudio.srcObject = event.streams[0]

          setTimeout(() => {
            this.remoteAudio.play().catch(() => {})
          }, 200)
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
      this.cleanupUa()
      this.listeners.onError?.('Failed to connect to SIP')
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
    if (!this.currentSession) return

    console.log('📞 Answering call')

    this.currentSession.answer({
      mediaConstraints: { audio: true, video: false },
    })
  }

  hangup() {
    if (this.currentSession) {
      console.log('📴 Hanging up')
      this.currentSession.terminate()
      this.cleanupCall()
    }
  }

  /* ===============================
     CLEANUP
     =============================== */
  cleanupCall() {
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null
      this.remoteAudio.remove()
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
