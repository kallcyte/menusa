import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { requireRestaurantUser } from './admin'
import { QrPanel } from '../features/workspace/QrPanel'
import { fetchAdminRestaurants } from '../api'

export const Route = createFileRoute('/admin/qr')({ beforeLoad: requireRestaurantUser, component: AdminQrRoute })

function AdminQrRoute() {
  const q = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurant = q.data?.restaurants?.[0] ?? null
  return restaurant ? <QrPanel restaurant={restaurant} /> : <div className="waitlist-empty"><h3>Belum ada restoran</h3></div>
}
