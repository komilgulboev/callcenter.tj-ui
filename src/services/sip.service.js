import JsSIP from 'jssip'

class SipService {
  ua = null
  currentSession = null
  remoteAudio = null

  listeners = {
    onRegistered: null,
    onDisconnected: null,
    onIncoming: null,
    onCallStart: null,
    onCallEnd: null,
  }

  setListeners(listeners) {
    this.listeners = { ...this.listeners, ...listeners }
  }

  connect({ wsUrl, sipUri, password }) {
    if (this.ua) {
      console.warn('⚠ SIP already connected')
      return
    }

    console.log('🔌 Connecting SIP…')

    const socket = new JsSIP.WebSocketInterface(wsUrl)

    this.ua = new JsSIP.UA({
      sockets: [socket],
      uri: sipUri,
      password,
      register: true,
      session_timers: false,
    })

    /* ===== REGISTRATION ===== */

    this.ua.on('registered', () => {
      console.log('✅ SIP registered')
      this.listeners.onRegistered?.()
    })

    this.ua.on('registrationFailed', (e) => {
      console.error('❌ Registration failed', e)
    })

    this.ua.on('disconnected', () => {
      console.warn('🔌 WS disconnected')
      this.listeners.onDisconnected?.()
    })

    /* ===== CALL HANDLING ===== */

    this.ua.on('newRTCSession', (e) => {
      const session = e.session

      // ⛔ prevent loop / duplicate
      if (this.currentSession) {
        console.warn('⚠ Session already exists, ignoring')
        return
      }

      this.currentSession = session
      console.log('📞 New RTC session:', e.originator)

      /* 🔊 Prepare audio */
      this.remoteAudio = document.createElement('audio')
      this.remoteAudio.autoplay = true
      this.remoteAudio.playsInline = true

      /* ✅ CORRECT WAY */
      session.on('peerconnection', (e) => {
        const pc = e.peerconnection
        console.log('🧠 PeerConnection ready')

        pc.addEventListener('track', (event) => {
          console.log('🔊 Remote audio track')
          this.remoteAudio.srcObject = event.streams[0]

          setTimeout(() => {
            this.remoteAudio.play().catch(() => {})
          }, 200)
        })
      })

      if (e.originator === 'remote') {
        this.listeners.onIncoming?.({
          from: session.remote_identity.uri.user,
        })
      }

      session.on('accepted', () => {
        console.log('📞 Call accepted')
        this.listeners.onCallStart?.()
      })

      session.on('ended', () => {
        console.log('📴 Call ended')
        this.cleanup()
      })

      session.on('failed', () => {
        console.log('❌ Call failed')
        this.cleanup()
      })
    })

    this.ua.start()
  }

  call(number) {
    if (!this.ua || this.currentSession) return

    console.log('📲 Calling', number)

    this.ua.call(`sip:${number}@172.20.40.3`, {
      mediaConstraints: { audio: true, video: false },
    })
  }

  answer() {
    if (!this.currentSession) return

    console.log('📞 Answering')

    this.currentSession.answer({
      mediaConstraints: { audio: true, video: false },
    })
  }

  hangup() {
    if (this.currentSession) {
      console.log('📴 Hangup')
      this.currentSession.terminate()
      this.cleanup()
    }
  }

  cleanup() {
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null
      this.remoteAudio = null
    }

    this.currentSession = null
    this.listeners.onCallEnd?.()
  }
}

export default new SipService()
