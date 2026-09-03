import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/superadmin/restaurants')({
  beforeLoad: () => { throw redirect({ to: '/admin/restaurants' }) },
  component: () => null,
})
