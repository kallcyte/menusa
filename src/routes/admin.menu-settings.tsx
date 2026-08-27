import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Admin } from '../App'

export const Route = createFileRoute('/admin/menu-settings')({ component: MenuSettingsRoute })

function MenuSettingsRoute() {
  const navigate = useNavigate()
  return <Admin navigate={path => navigate({ to: path as never })} initialTab="menu-settings" />
}
