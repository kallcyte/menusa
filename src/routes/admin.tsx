import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Admin } from '../App'

export const Route = createFileRoute('/admin')({ component: AdminRoute })

function AdminRoute() {
  const navigate = useNavigate()
  return <Admin navigate={path => navigate({ to: path as never })} initialTab="menu" />
}
