import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { QrPanel } from '../features/workspace/QrPanel'
import { useQuery } from '@tanstack/react-query'
import { fetchAdminRestaurants } from '../api'

export const Route = createFileRoute('/app/qr')({ component: AppQrRoute })

function AppQrRoute() {
  const q = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurant = q.data?.restaurants?.[0] ?? null
  return (
    <AppShell>
      {restaurant ? <QrPanel restaurant={restaurant} /> : <div className="waitlist-empty"><h3>Belum ada restoran</h3></div>}
    </AppShell>
  )
}
