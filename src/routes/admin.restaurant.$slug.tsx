import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchSuperadminRestaurants } from '../api'
import { SuperadminRestaurantDetail } from '../features/superadmin/Superadmin'
import { requireSuperadmin } from './admin'

export const Route = createFileRoute('/admin/restaurant/$slug')({
  beforeLoad: requireSuperadmin,
  component: AdminRestaurantRoute,
})

function AdminRestaurantRoute() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['superadmin', 'restaurants'],
    queryFn: fetchSuperadminRestaurants,
    staleTime: 30_000,
  })
  if (useLocation().pathname.endsWith('/settings')) return <Outlet />
  if (query.isPending) return <div className="waitlist-loading">Memuat restoran…</div>
  if (query.isError) return <div className="waitlist-error-panel">Gagal memuat restoran.</div>

  const restaurant = query.data?.restaurants.find((entry) => entry.slug === slug)
  if (!restaurant) {
    return (
      <div className="waitlist-error-panel">
        <p>Restoran tidak ditemukan.</p>
        <button className="button outline-button" onClick={() => void navigate({ to: '/admin/restaurants' })}>
          Kembali ke restoran
        </button>
      </div>
    )
  }

  return <SuperadminRestaurantDetail restaurantId={restaurant.id} onBack={() => void navigate({ to: '/admin/restaurants' })} />
}
