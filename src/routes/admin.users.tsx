import { createFileRoute } from '@tanstack/react-router'
import { requireSuperadmin } from './admin'
import { SuperadminUsersPage } from '../features/superadmin/SuperadminUsersPage'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: requireSuperadmin,
  component: () => <SuperadminUsersPage />,
})
