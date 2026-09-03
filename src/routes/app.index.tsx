import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../features/app/AppShell'
import { AdminMenuPage } from '../features/app/pages/AdminMenuPage'
import { OverviewPanel, type SuperadminTab } from '../features/superadmin/Superadmin'
import { fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/app/')({
  component: AppIndexRoute,
})

function AppIndexRoute() {
  const navigate = useNavigate()
  const meQuery = useQuery({ queryKey: ["superadmin", "me"], queryFn: fetchSuperadminMe, staleTime: 30_000, retry: false })

  if (meQuery.isPending) {
    return <AppShell><div className="waitlist-loading">Memuat workspace…</div></AppShell>
  }

  if (meQuery.data?.user.role === "superadmin") {
    const paths: Record<SuperadminTab, string> = {
      overview: "/app",
      waitlist: "/app/waitlist",
      users: "/app/users",
      restaurants: "/app/restaurants",
      broadcast: "/app/campaigns",
    }
    return <AppShell><OverviewPanel onNavigate={(tab) => void navigate({ to: paths[tab] as never })} /></AppShell>
  }

  return (
    <AppShell>
      <AdminMenuPage />
    </AppShell>
  )
}
