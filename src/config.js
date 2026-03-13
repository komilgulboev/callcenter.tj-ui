/**
 * ============================================================
 * ЕДИНЫЙ КОНФИГ ФРОНТЕНДА
 * Все адреса интеграций — только здесь
 * ============================================================
 *
 * Для разработки: значения берутся из .env.local
 * Для продакшена: значения берутся из .env.production
 *
 * Создай файл .env.local в корне проекта:
 *   VITE_TURN_URL=turn:10.154.96.250:3478
 *   VITE_TURN_USER=callcentrix
 *   VITE_TURN_PASS=changeme123
 *   VITE_STUN_URL=stun:10.154.96.250:3478
 */

// ── TURN / STUN (WebRTC) ─────────────────────────────────────
export const ICE_SERVERS = [
  {
    urls:       import.meta.env.VITE_TURN_URL  || 'turn:10.154.96.250:3478',
    username:   import.meta.env.VITE_TURN_USER || 'callcentrix',
    credential: import.meta.env.VITE_TURN_PASS || 'changeme123',
  },
  {
    urls: import.meta.env.VITE_STUN_URL || 'stun:10.154.96.250:3478',
  },
  {
    urls: 'stun:stun.l.google.com:19302', // резервный публичный STUN
  },
]

export const ICE_CONFIG = {
  iceServers:         ICE_SERVERS,
  iceTransportPolicy: 'all',
  sdpSemantics:       'unified-plan',
}