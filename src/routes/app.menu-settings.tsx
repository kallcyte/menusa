import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { MenuSettingsPanel } from '../features/workspace/MenuSettingsPanel'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAdminRestaurants } from '../api'

export const Route = createFileRoute('/app/menu-settings')({ component: AppMenuSettingsRoute })

function AppMenuSettingsRoute() {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurant = q.data?.restaurants?.[0] ?? null
  return (
    <AppShell>
      {restaurant ? <MenuSettingsPanel restaurant={restaurant} onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] })} /> : <div className="waitlist-empty"><h3>Belum ada restoran</h3></div>}
    </AppShell>
  )
}
