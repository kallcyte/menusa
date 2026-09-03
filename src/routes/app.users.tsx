import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { SuperadminUsersPage } from '../features/superadmin/SuperadminUsersPage'
import { fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/app/users')({
  beforeLoad: async () => {
    try {
      const me = await fetchSuperadminMe()
      if (me.user.role !== 'superadmin') throw redirect({ to: '/app' })
    } catch (e: unknown) {
      if (e instanceof Response) throw e
      throw redirect({ to: '/app' })
    }
  },
  component: AppUsersRoute,
})

function AppUsersRoute() {
  return (
    <AppShell>
      <SuperadminUsersPage />
    </AppShell>
  )
}
