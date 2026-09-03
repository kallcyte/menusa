import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { CampaignsPanel } from '../features/superadmin/CampaignsPanel'
import { fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/app/campaigns')({
  beforeLoad: async () => {
    try {
      const me = await fetchSuperadminMe()
      if (me.user.role !== 'superadmin') throw redirect({ to: '/app' })
    } catch (e: unknown) {
      if (e instanceof Response) throw e
      throw redirect({ to: '/app' })
    }
  },
  component: AppCampaignsRoute,
})

function AppCampaignsRoute() {
  return (
    <AppShell>
      <CampaignsPanel />
    </AppShell>
  )
}
