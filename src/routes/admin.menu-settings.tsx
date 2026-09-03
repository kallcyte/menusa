import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { requireRestaurantUser } from './admin'
import { MenuSettingsPanel } from '../features/workspace/MenuSettingsPanel'
import { fetchAdminRestaurants } from '../api'

export const Route = createFileRoute('/admin/menu-settings')({ beforeLoad: requireRestaurantUser, component: AdminMenuSettingsRoute })

function AdminMenuSettingsRoute() {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurant = q.data?.restaurants?.[0] ?? null
  return restaurant ? <MenuSettingsPanel restaurant={restaurant} onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] })} /> : <div className="waitlist-empty"><h3>Belum ada restoran</h3></div>
}
