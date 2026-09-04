import { createFileRoute } from '@tanstack/react-router'
import { requireSuperadmin } from './admin'
import { SuperadminRestaurantSettingsPage } from '../features/superadmin/SuperadminRestaurantSettingsPage'

export const Route = createFileRoute('/admin/restaurant/$slug/settings')({
  beforeLoad: requireSuperadmin,
  component: AdminRestaurantSettingsRoute,
})

function AdminRestaurantSettingsRoute() {
  const { slug } = Route.useParams()
  return <SuperadminRestaurantSettingsPage slug={slug} />
}
