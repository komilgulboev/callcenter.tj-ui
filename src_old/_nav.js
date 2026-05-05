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

// Каждый пункт меню имеет поле access:
// { roles: [0,1,2], adminAccess: true, superAdminOnly: false }
// roles — список ROLE значений для агентов
// adminAccess — виден тенант-админу
// superAdminOnly — только главный админ

const _nav = [
  {
    component: CNavItem,
    name: 'phone',
    to: '/webphone',
    icon: <CIcon icon={cilPhone} customClassName="nav-icon" />,
    access: { roles: [0, 1, 2], adminAccess: true },
  },
  {
    component: CNavItem,
    name: 'monitoring',
    to: '/dashboard',
    icon: <CIcon icon={cilMonitor} customClassName="nav-icon" />,
    access: { roles: [1], adminAccess: true },
  },
  {
    component: CNavItem,
    name: 'tickets',
    to: '/tickets',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    access: { roles: [0, 1, 2], adminAccess: true },
  },
  {
    component: CNavItem,
    name: 'staff',
    to: '/staff',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    access: { roles: [2], adminAccess: true },
  },
  {
    component: CNavItem,
    name: 'companies',
    to: '/companies',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    access: { roles: [], adminAccess: false, superAdminOnly: true },
  },
  {
    component: CNavGroup,
    name: 'reports',
    to: '',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    access: { roles: [1], adminAccess: true },
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
    access: { roles: [], adminAccess: true, superAdminOnly: true },
  },
  {
    component: CNavItem,
    name: 'docs',
    href: 'https://coreui.io/react/docs/templates/installation/',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    access: { roles: [], adminAccess: true, superAdminOnly: true },
  },
]

export default _nav