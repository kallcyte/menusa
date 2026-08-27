import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Admin } from '../App'

export const Route = createFileRoute('/account/settings')({ component: AccountSettingsRoute })

function AccountSettingsRoute() {
  const navigate = useNavigate()
  return <Admin navigate={path => navigate({ to: path as never })} initialTab="account" />
}
