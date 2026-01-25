import JsSIP from 'jssip'

let ua = null
let currentSession = null

export function initSip({ wsUrl, sipUser, sipPassword, domain }) {
  if (ua) {
    console.warn('SIP already initialized')
    return
  }

  const socket = new JsSIP.WebSocketInterface(wsUrl)

  ua = new JsSIP.UA({
    sockets: [socket],
    uri: `sip:${sipUser}@${domain}`,
    password: sipPassword,
    register: true,
    session_timers: false,
  })

  ua.on('registered', () => {
    console.log('📞 SIP registered')
  })

  ua.on('registrationFailed', (e) => {
    console.error('❌ SIP registration failed', e.cause)
  })

  ua.on('newRTCSession', (e) => {
    currentSession = e.session

    if (e.originator === 'remote') {
      console.log('📥 Incoming call')
    }

    currentSession.on('ended', () => {
      console.log('📴 Call ended')
      currentSession = null
    })

    currentSession.on('failed', () => {
      console.log('❌ Call failed')
      currentSession = null
    })
  })

  ua.start()
}

export function call(number) {
  if (!ua) {
    console.error('SIP not initialized')
    return
  }

  ua.call(`sip:${number}`, {
    mediaConstraints: { audio: true, video: false },
  })
}

export function hangup() {
  if (currentSession) {
    currentSession.terminate()
    currentSession = null
  }
}
import JsSIP from 'jssip'

class SipService {
  ua = null
  currentSession = null
  remoteAudio = null
  isCalling = false

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
    if (this.ua) return

    console.log('🔌 Connecting SIP…')

    const socket = new JsSIP.WebSocketInterface(wsUrl)

    this.ua = new JsSIP.UA({
      sockets: [socket],
      uri: sipUri,
      password,
      register: true,
      session_timers: false,
    })

    /* === REGISTRATION === */

    this.ua.on('registered', () => {
      console.log('✅ SIP registered')
      this.listeners.onRegistered?.()
    })

    this.ua.on('disconnected', () => {
      console.warn('🔌 WS disconnected')
      this.listeners.onDisconnected?.()
    })

    /* === CALL HANDLING === */

    this.ua.on('newRTCSession', (e) => {
      const session = e.session

      // ❗ ЗАЩИТА ОТ ПЕТЛИ
      if (this.currentSession) {
        console.warn('⚠️ Session already exists, ignoring new one')
        session.terminate()
        return
      }

      this.currentSession = session
      console.log('📞 New RTC session', e.originator)

      /* 🔊 AUDIO */
      this.remoteAudio = document.createElement('audio')
      this.remoteAudio.autoplay = true
      this.remoteAudio.playsInline = true

      session.connection.addEventListener('track', (event) => {
        this.remoteAudio.srcObject = event.streams[0]
      })

      /* 📥 INCOMING ONLY */
      if (e.originator === 'remote') {
        this.listeners.onIncoming?.({
          from: session.remote_identity.uri.user,
        })
      }

      session.on('accepted', () => {
        console.log('📞 Call accepted')
        this.listeners.onCallStart?.()
        this.isCalling = false
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
    if (!this.ua || this.currentSession) {
      console.warn('⚠️ Cannot call, session exists or UA not ready')
      return
    }

    this.isCalling = true

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
      this.currentSession.terminate()
      this.cleanup()
    }
  }

  cleanup() {
    console.log('🧹 Cleanup call')

    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null
      this.remoteAudio = null
    }

    this.currentSession = null
    this.isCalling = false
    this.listeners.onCallEnd?.()
  }
}

export default new SipService()
