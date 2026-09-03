import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { WaitlistPanel } from '../features/workspace/WaitlistPanel'
import { fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/app/waitlist')({
  beforeLoad: async () => {
    try {
      const me = await fetchSuperadminMe()
      if (me.user.role !== 'superadmin') throw redirect({ to: '/app' })
    } catch (e: unknown) {
      if (e instanceof Response) throw e
      throw redirect({ to: '/app' })
    }
  },
  component: AppWaitlistRoute,
})

function AppWaitlistRoute() {
  return (
    <AppShell>
      <WaitlistPanel />
    </AppShell>
  )
}
