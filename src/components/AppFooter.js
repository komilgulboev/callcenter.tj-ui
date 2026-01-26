import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="https://callcentrix.tj" target="_blank" rel="noopener noreferrer">
          CallCentrix
        </a>
        <span className="ms-1">&copy; 2026 Pumpkin-Labs.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered by</span>
        <a href="https://tcell.tj" target="_blank" rel="noopener noreferrer">
          Tcell Corporate Department &amp; 
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
