import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/superadmin/broadcast')({
  beforeLoad: () => { throw redirect({ to: '/admin/campaigns' }) },
  component: () => null,
})
