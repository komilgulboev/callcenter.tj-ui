import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar, CContainer, CDropdown, CDropdownDivider,
  CDropdownItem, CDropdownMenu, CDropdownToggle,
  CHeader, CHeaderNav, CHeaderToggler, CNavItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilAccountLogout, cilUser, cilSettings } from '@coreui/icons'
import useUIStore from 'src/store/ui'
import useAuthStore from 'src/store/auth'

const ROLE_LABELS = ['SuperAdmin', 'TenantAdmin', 'Supervisor', 'Operator']
const ROLE_COLORS = ['danger', 'primary', 'warning', 'info']

export default function AppHeader() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleLabel = user ? (ROLE_LABELS[user.userType] ?? 'User') : ''
  const roleColor = user ? (ROLE_COLORS[user.userType] ?? 'secondary') : 'secondary'
  const initials  = user?.username?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <CHeader position="sticky" className="mb-4 p-0">
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler onClick={toggleSidebar} style={{ marginInlineStart: '-14px' }}>
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <CHeaderNav className="ms-auto">
          <CNavItem className="d-flex align-items-center me-3">
            <span className={`badge bg-${roleColor}`}>{roleLabel}</span>
          </CNavItem>

          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false} className="py-0 pe-0">
              <CAvatar color="primary" size="md" textColor="white">
                {initials}
              </CAvatar>
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem className="fw-semibold" disabled>
                {user?.username}
              </CDropdownItem>
              <CDropdownDivider />
              <CDropdownItem onClick={() => navigate('/settings')}>
                <CIcon icon={cilSettings} className="me-2" /> Settings
              </CDropdownItem>
              <CDropdownDivider />
              <CDropdownItem onClick={handleLogout} className="text-danger">
                <CIcon icon={cilAccountLogout} className="me-2" /> Logout
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}
