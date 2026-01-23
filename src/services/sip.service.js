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
