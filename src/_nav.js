import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilChartPie,
  cilDescription,
  cilMonitor,
  cilNotes,
  cilPeople,
  cilPhone,
  cilBuilding,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'phone',
    to: '/webphone',
    icon: <CIcon icon={cilPhone} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'monitoring',
    to: '/dashboard',
    icon: <CIcon icon={cilMonitor} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'tickets',
    to: '/tickets',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'staff',
    to: '/staff',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'companies',
    to: '/companies',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'reports',
    to: '',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'report_calls',
        to: '/report_calls',
      },
      {
        component: CNavItem,
        name: 'report_by_staff',
        to: '/report_by_staff',
      },
    ],
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