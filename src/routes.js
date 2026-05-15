import React from 'react'

const Dashboard    = React.lazy(() => import('src/views/dashboard/Dashboard'))
const Tenants      = React.lazy(() => import('src/views/tenants/Tenants'))
const TenantUsers  = React.lazy(() => import('src/views/tenants/TenantUsers'))
const Users        = React.lazy(() => import('src/views/users/Users'))
const Monitor      = React.lazy(() => import('src/views/monitor/Monitor'))
const CDR          = React.lazy(() => import('src/views/cdr/CDR'))
const Tickets      = React.lazy(() => import('src/views/tickets/Tickets'))
const TicketDetail = React.lazy(() => import('src/views/tickets/TicketDetail'))
const Topics       = React.lazy(() => import('src/views/topics/Topics'))
const IVR          = React.lazy(() => import('src/views/ivr/IVR'))
const Whitelist    = React.lazy(() => import('src/views/whitelist/Whitelist'))
const Settings     = React.lazy(() => import('src/views/settings/Settings'))
const Phone = React.lazy(() => import('src/views/phone/Phone.jsx'))

const routes = [
  { path: '/dashboard',    name: 'Dashboard',    element: Dashboard },
  { path: '/tenants',      name: 'Tenants',      element: Tenants,     roles: [0] },
  { path: '/tenant-users', name: 'Tenant Users', element: TenantUsers, roles: [0] },
  { path: '/users',        name: 'Users',        element: Users,       roles: [0, 1] },
  { path: '/webphone', name: 'WebPhone', element: Phone }, // без roles — для всех
  { path: '/monitor',      name: 'Monitor',      element: Monitor,     roles: [0, 1, 2] },
  { path: '/cdr',          name: 'CDR',          element: CDR,         roles: [0, 1, 2] },
  { path: '/tickets',      name: 'Tickets',      element: Tickets },
  { path: '/tickets/:id',  name: 'Ticket',       element: TicketDetail },
  { path: '/topics',       name: 'Topics',       element: Topics,      roles: [0, 1] },
  { path: '/ivr',          name: 'IVR',          element: IVR,         roles: [1] },
  { path: '/whitelist',    name: 'Whitelist',    element: Whitelist,   roles: [0, 1] },
  { path: '/settings',     name: 'Settings',     element: Settings,    roles: [0, 1] },
]

export default routes
