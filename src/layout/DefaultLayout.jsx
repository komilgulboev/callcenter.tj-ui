import React from 'react'
import { AppContent, AppFooter, AppHeader, AppSidebar } from 'src/components'
import PhoneWidget from 'src/components/phone/PhoneWidget'
import { usePhoneInit } from 'src/hooks/usePhoneInit'

export default function DefaultLayout() {
  // Initialize JsSIP once for the whole app session
  usePhoneInit()

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
      <PhoneWidget />
    </div>
  )
}
