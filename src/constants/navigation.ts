export type NavigationItem = {
  label: string
  to: string
  description: string
}

export const navigationItems = [
  {
    label: 'Home',
    to: '/',
    description: 'Team schedule and highlights',
  },
  {
    label: 'Request Leave',
    to: '/request',
    description: 'Create a new leave request',
  },
  {
    label: 'My Requests',
    to: '/my-requests',
    description: 'Your leave requests and status',
  },
  {
    label: 'Approvals',
    to: '/approvals',
    description: 'Requests awaiting your review',
  },
  {
    label: 'Admin',
    to: '/admin',
    description: 'Manage teams and access',
  },
] as const satisfies readonly NavigationItem[]
