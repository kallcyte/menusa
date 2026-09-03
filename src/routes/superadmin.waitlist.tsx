import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/superadmin/waitlist')({
  beforeLoad: () => { throw redirect({ to: '/admin/waitlist' }) },
  component: () => null,
})
