import React from 'react'
import { NavLink } from 'react-router-dom'
import { CBadge, CNavItem, CNavLink, CNavTitle, CSidebarNav } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import SimpleBar from 'simplebar-react'

export default function AppSidebarNav({ items }) {
  return (
    <CSidebarNav as={SimpleBar}>
      {items.map((item, i) => {
        if (item.component === 'CNavTitle') {
          return <CNavTitle key={i}>{item.name}</CNavTitle>
        }
        return (
          <CNavItem key={i}>
            <CNavLink as={NavLink} to={item.to}>
              {item.icon && <CIcon customClassName="nav-icon" icon={item.icon} />}
              {item.name}
              {item.badge && (
                <CBadge color={item.badge.color} className="ms-auto">
                  {item.badge.text}
                </CBadge>
              )}
            </CNavLink>
          </CNavItem>
        )
      })}
    </CSidebarNav>
  )
}
