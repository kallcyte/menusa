import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Admin } from '../App'

export const Route = createFileRoute('/admin/waitlist')({ component: WaitlistRoute })

function WaitlistRoute() {
  const navigate = useNavigate()
  return <Admin navigate={(path) => navigate({ to: path as never })} initialTab="waitlist" />
}
