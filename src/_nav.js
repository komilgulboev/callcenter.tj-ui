import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilExternalLink,
  cilMonitor,
  cilNotes,
  cilPencil,
  cilPeople,
  cilPhone,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'phone',
    to: '/charts',
    icon: <CIcon icon={cilPhone} customClassName="nav-icon" />,
  },
    {
    component: CNavItem,
    name: 'monitoring',
    to: '/charts',
    icon: <CIcon icon={cilMonitor} customClassName="nav-icon" />,
  },
    {
    component: CNavItem,
    name: 'staff',
    to: '/charts',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
   {
    component: CNavItem,
    name: 'reports',
    to: '/charts',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'extra',
  },
    {
    component: CNavItem,
    name: 'docs',
    href: 'https://coreui.io/react/docs/templates/installation/',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  },
]

export default _nav
