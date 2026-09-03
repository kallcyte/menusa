import { createFileRoute } from '@tanstack/react-router'
import { requireSuperadmin } from './admin'
import { SuperadminRestaurantsPage } from '../features/superadmin/SuperadminRestaurantsPage'

export const Route = createFileRoute('/admin/restaurants')({
  beforeLoad: requireSuperadmin,
  component: () => <SuperadminRestaurantsPage />,
})
