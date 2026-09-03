import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminMenuPage } from '../features/app/pages/AdminMenuPage'
import { OverviewPanel, type SuperadminTab } from '../features/superadmin/Superadmin'
import { fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/admin/')({
  component: AdminIndexRoute,
})

function AdminIndexRoute() {
  const navigate = useNavigate()
  const meQuery = useQuery({ queryKey: ["superadmin", "me"], queryFn: fetchSuperadminMe, staleTime: 30_000, retry: false, enabled: typeof window !== 'undefined' })

  if (meQuery.isPending) return <div className="waitlist-loading">Memuat workspace…</div>

  if (meQuery.data?.user.role === "superadmin") {
    const paths: Record<SuperadminTab, string> = {
      overview: "/admin",
      waitlist: "/admin/waitlist",
      users: "/admin/users",
      restaurants: "/admin/restaurants",
      broadcast: "/admin/campaigns",
    }
    return <OverviewPanel onNavigate={(tab) => void navigate({ to: paths[tab] as never })} />
  }

  return <AdminMenuPage />
}
