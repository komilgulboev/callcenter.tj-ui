import JsSIP from 'jssip'
import api from './api'
import { ICE_CONFIG } from '../config'

class SipService {
  ua = null
  currentSession = null
  remoteAudio = null
  connecting = false
  state = 'idle'

  listeners = {
    onRegistered:   null,
    onDisconnected: null,
    onIncoming:     null,
    onStateChange:  null,
    onError:        null,
  }

  setListeners(listeners) {
    this.listeners = { ...this.listeners, ...listeners }
  }

  emitState(state) {
    this.state = state
    this.listeners.onStateChange?.(state)
  }

  async loadCredentials() {
    const res = await api.get('/api/sip/credentials')
    return res.data
  }

  // Определяем WS URL из данных сервера:
  // - HTTP страница + есть внутренний URL → ws://... (напрямую к Asterisk)
  // - HTTPS страница → wss:// через прокси (браузер запрещает ws:// с HTTPS)
  resolveWsUrl(wsUrl, wsUrlInternal) {
    const isHttps = window.location.protocol === 'https:'

    if (!isHttps && wsUrlInternal) {
      // HTTP + есть внутренний URL → напрямую к Asterisk
      return wsUrlInternal
    }
    // HTTPS → через прокси на том же хосте
    return wsUrl
  }

  async connect() {
    if (this.ua || this.connecting) return
    this.connecting = true

    try {
      const creds = await this.loadCredentials()
      const sipUri = `sip:${creds.sipUser}@${creds.domain}`
      const resolvedWsUrl = this.resolveWsUrl(creds.wsUrl, creds.wsUrlInternal)
      const socket = new JsSIP.WebSocketInterface(resolvedWsUrl)

      this.ua = new JsSIP.UA({
        sockets:        [socket],
        uri:            sipUri,
        password:       creds.sipPassword,
        register:       true,
        session_timers: false,
        pcConfig:       ICE_CONFIG,
      })

      this.ua.on('registered', () => {
        this.connecting = false
        this.listeners.onRegistered?.()
      })

      this.ua.on('disconnected', () => {
        this.cleanupUa()
        this.listeners.onDisconnected?.()
      })

      this.ua.on('newRTCSession', (e) => {
        const session = e.session

        if (this.currentSession) {
          session.terminate()
          return
        }

        this.currentSession = session

        this.remoteAudio = document.createElement('audio')
        this.remoteAudio.autoplay    = true
        this.remoteAudio.playsInline = true
        document.body.appendChild(this.remoteAudio)

        const waitForConnection = () => {
          if (!session.connection) { setTimeout(waitForConnection, 50); return }
          session.connection.addEventListener('track', (event) => {
            this.remoteAudio.srcObject = event.streams[0]
            setTimeout(() => this.remoteAudio.play().catch(() => {}), 100)
          })
        }
        waitForConnection()

        if (e.originator === 'remote') {
          this.emitState('ringing')
          this.listeners.onIncoming?.({ from: session.remote_identity.uri.user })
        } else {
          this.emitState('calling')
        }

        session.on('accepted',  () => this.emitState('in-call'))
        session.on('confirmed', () => this.emitState('in-call'))
        session.on('ended',     () => this.cleanupCall())
        session.on('failed',    () => this.cleanupCall())

        session.on('peerconnection', (e) => {
          const pc = e.peerconnection
          pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') {
              pc.restartIce()
            }
          }
        })
      })

      this.ua.start()
    } catch (err) {
      console.error('❌ SIP connect error:', err)
      this.cleanupUa()
      this.listeners.onError?.('Failed to connect SIP')
    }
  }

  call(number) {
    if (!this.ua || this.currentSession) return
    this.ua.call(`sip:${number}`, {
      mediaConstraints:     { audio: true, video: false },
      pcConfig:             ICE_CONFIG,
      rtcOfferConstraints:  { offerToReceiveAudio: true, offerToReceiveVideo: false },
      sessionTimersExpires: 120,
    })
  }

  answer() {
    if (!this.currentSession) return
    if (!this.currentSession.isInProgress()) return
    this.currentSession.answer({
      mediaConstraints:     { audio: true, video: false },
      pcConfig:             ICE_CONFIG,
      rtcAnswerConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    })
  }

  hangup() {
    this.currentSession?.terminate()
    this.cleanupCall()
  }

  mute() {
    if (!this.currentSession) return
    this.currentSession.mute({ audio: true })
    this.emitState('muted')
  }

  unmute() {
    if (!this.currentSession) return
    this.currentSession.unmute({ audio: true })
    this.emitState('in-call')
  }

  hold() {
    if (!this.currentSession) return
    if (this.currentSession.isOnHold().local) return
    this.currentSession.hold()
    this.emitState('on-hold')
  }

  unhold() {
    if (!this.currentSession) return
    if (!this.currentSession.isOnHold().local) return
    this.currentSession.unhold()
    this.emitState('in-call')
  }

  cleanupCall() {
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null
      this.remoteAudio.remove()
      this.remoteAudio = null
    }
    this.currentSession = null
    this.emitState('idle')
  }

  cleanupUa() {
    this.ua         = null
    this.connecting = false
    this.emitState('idle')
  }
}

export default new SipService()