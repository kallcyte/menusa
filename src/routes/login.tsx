import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Login } from '../App'

export const Route = createFileRoute('/login')({ component: LoginRoute })

function LoginRoute() {
  const navigate = useNavigate()
  return <Login navigate={path => navigate({ to: path as never })} />
}
