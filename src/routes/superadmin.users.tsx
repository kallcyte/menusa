import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Superadmin } from '../App'

export const Route = createFileRoute('/superadmin/users')({ component: RouteComponent })

function RouteComponent() {
  const navigate = useNavigate()
  return <Superadmin navigate={path => navigate({ to: path as never })} initialTab="users" />
}
