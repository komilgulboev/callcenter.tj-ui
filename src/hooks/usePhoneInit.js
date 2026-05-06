import { useEffect } from 'react'
import useAuthStore from 'src/store/auth'
import usePhoneStore from 'src/store/phone'

const WS_URI     = import.meta.env.VITE_WS_URI     || 'wss://localhost:8089/ws'
const SIP_DOMAIN = import.meta.env.VITE_SIP_DOMAIN || 'localhost'

/**
 * Call this hook ONCE in DefaultLayout.
 * Initializes JsSIP when user logs in, destroys on logout.
 */
export function usePhoneInit() {
  const user    = useAuthStore((s) => s.user)
  const { init, destroy, status } = usePhoneStore()

  useEffect(() => {
    // SuperAdmin has no SIP extension
    if (!user || user.userType === 0) return

    const sipNo      = user.username
    const sipPassword = localStorage.getItem('sipPassword') || ''

    if (!sipNo || !sipPassword) return

    init({
      wsUri:       WS_URI,
      sipUri:      `sip:${sipNo}@${SIP_DOMAIN}`,
      password:    sipPassword,
      displayName: user.username,
    })

    return () => destroy()
  }, [user?.id])

  return status
}
