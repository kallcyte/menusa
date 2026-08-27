import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Superadmin } from '../App'

export const Route = createFileRoute('/superadmin')({ component: SuperadminRoute })

function SuperadminRoute() {
  const navigate = useNavigate()
  return <Superadmin navigate={path => navigate({ to: path as never })} initialTab="waitlist" />
}
