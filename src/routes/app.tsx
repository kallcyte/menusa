import { createFileRoute, redirect } from '@tanstack/react-router'

// /admin is the canonical authenticated workspace. Keep /app as a compatibility alias.
export const Route = createFileRoute('/app')({
  beforeLoad: () => { throw redirect({ to: '/admin' }) },
  component: () => null,
})
