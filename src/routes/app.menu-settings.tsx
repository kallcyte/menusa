import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppShell } from '../features/app/AppShell'
import { MenuSettingsPanel } from '../features/workspace/MenuSettingsPanel'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAdminRestaurants } from '../api'

export const Route = createFileRoute('/app/menu-settings')({ component: AppMenuSettingsRoute })

function AppMenuSettingsRoute() {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurants = q.data?.restaurants ?? []
  const [restaurantId, setRestaurantId] = useState("")
  const restaurant = restaurants.find((entry) => entry.id === restaurantId) ?? restaurants[0] ?? null
  useEffect(() => {
    if (restaurants[0] && !restaurants.some((entry) => entry.id === restaurantId)) setRestaurantId(restaurants[0].id)
  }, [restaurants, restaurantId])
  return (
    <AppShell>
      {restaurant ? <MenuSettingsPanel restaurant={restaurant} restaurants={restaurants} onRestaurantChange={setRestaurantId} onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] })} /> : <div className="waitlist-empty"><h3>Belum ada restoran</h3></div>}
    </AppShell>
  )
}
