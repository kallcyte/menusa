import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { SuperadminRestaurantsPage } from '../features/superadmin/SuperadminRestaurantsPage'
import { fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/app/restaurants')({
  beforeLoad: async () => {
    try {
      const me = await fetchSuperadminMe()
      if (me.user.role !== 'superadmin') throw redirect({ to: '/app' })
    } catch (e: unknown) {
      if (e instanceof Response) throw e
      throw redirect({ to: '/app' })
    }
  },
  component: AppRestaurantsRoute,
})

function AppRestaurantsRoute() {
  return (
    <AppShell>
      <SuperadminRestaurantsPage />
    </AppShell>
  )
}
