import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { logout } from '../../services/auth.service'
import { getApiUrl, getAuthHeaders } from '../../api'
import { getTokenPayload } from '../../utils/tokenUtils'

// Тот же Avatar что и в Staff.js
function Avatar({ member, size = 36 }) {
  if (!member) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#4f46e5', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.35,
      }}>?</div>
    )
  }

  const initials = ((member.firstName?.[0] || '') + (member.lastName?.[0] || '')).toUpperCase()
    || member.username?.[0]?.toUpperCase() || '?'
  const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7']
  const bg = colors[(member.id || 0) % colors.length]

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {member.avatarUrl && (
        <img
          src={member.avatarUrl}
          alt=""
          style={{
            width: size, height: size, borderRadius: '50%',
            objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1,
          }}
          onError={e => e.target.style.display = 'none'}
        />
      )}
      <div style={{
        display: 'flex', width: size, height: size, borderRadius: '50%',
        background: bg, color: '#fff', fontWeight: 700,
        fontSize: size * 0.35, alignItems: 'center', justifyContent: 'center',
      }}>
        {initials}
      </div>
    </div>
  )
}

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [currentMember, setCurrentMember] = useState(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload?.sub) return

    fetch(getApiUrl('/api/staff'), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!Array.isArray(data)) return
        const me = data.find(m => m.id === payload.sub)
        if (me) setCurrentMember(me)
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const fullName = currentMember
    ? [currentMember.firstName, currentMember.lastName].filter(Boolean).join(' ') || currentMember.username
    : t('account', { defaultValue: 'Аккаунт' })

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <Avatar member={currentMember} size={36} />
      </CDropdownToggle>

      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          {fullName}
        </CDropdownHeader>

        <CDropdownItem href="#">
          <CIcon icon={cilUser} className="me-2" />
          {t('profile', { defaultValue: 'Профиль' })}
        </CDropdownItem>

        <CDropdownDivider />

        <CDropdownItem onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilLockLocked} className="me-2" />
          {t('logout', { defaultValue: 'Выйти' })}
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
