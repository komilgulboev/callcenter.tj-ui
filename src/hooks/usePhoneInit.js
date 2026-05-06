import { useEffect } from 'react'
import useAuthStore from 'src/store/auth'
import usePhoneStore from 'src/store/phone'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export function usePhoneInit() {
  const user = useAuthStore((s) => s.user)
  const init = usePhoneStore((s) => s.init)
  const destroy = usePhoneStore((s) => s.destroy)

  useEffect(() => {
    if (!user) return
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = `https://${import.meta.env.VITE_SIP_DOMAIN || '172.20.40.3'}:8089/httpstatus`
  document.body.appendChild(iframe)
  setTimeout(() => iframe.remove(), 5000)
    fetch(`${API_URL}/api/phone/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then(({ wsUri, sipUri, password, displayName }) => {
        init({ wsUri, sipUri, password, displayName })
      })
      .catch((err) => console.error('Phone init failed:', err))

    return () => destroy()
  }, [user?.id])
}