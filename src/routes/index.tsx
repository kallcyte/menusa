import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Landing } from '../features/landing/Landing'

export const Route = createFileRoute('/')({ component: HomeRoute })

function HomeRoute() {
  const navigate = useNavigate()
  return <Landing navigate={path => navigate({ to: path as never })} />
}
