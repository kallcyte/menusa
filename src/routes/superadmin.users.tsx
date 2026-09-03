import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/superadmin/users')({
  beforeLoad: () => { throw redirect({ to: '/admin/users' }) },
  component: () => null,
})
