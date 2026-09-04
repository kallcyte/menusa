import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { fetchSuperadminRestaurants } from "../../api"
import { errorMessage } from "../shared"
import { SuperadminRestaurantSettings } from "./Superadmin"

export function SuperadminRestaurantSettingsPage({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["superadmin", "restaurants"],
    queryFn: fetchSuperadminRestaurants,
    staleTime: 30_000,
  })
  const restaurant = query.data?.restaurants.find((entry) => entry.slug === slug)

  if (query.isPending) return <div className="waitlist-loading">Memuat restoran…</div>
  if (query.isError) return <div className="waitlist-error-panel">{errorMessage(query.error, "Couldn't load restaurant.")}</div>
  if (!restaurant) {
    return (
      <div className="waitlist-error-panel">
        <p>Restoran tidak ditemukan.</p>
        <button className="button outline-button" onClick={() => void navigate({ to: "/admin/restaurants" })}>
          Kembali ke restoran
        </button>
      </div>
    )
  }
  const refreshRestaurant = (nextSlug: string) => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurants"] }),
      queryClient.invalidateQueries({ queryKey: ["superadmin", "restaurant", restaurant.id] }),
    ])
    if (nextSlug !== restaurant.slug) {
      void navigate({ to: "/admin/restaurant/$slug/settings", params: { slug: nextSlug } })
    }
  }

  return (
    <div className="superadmin-panel superadmin-detail">
      <button className="superadmin-back" onClick={() => void navigate({ to: "/admin/restaurant/$slug", params: { slug: restaurant.slug } })}>
        <ArrowLeft size={14} /> Back to restaurant
      </button>
      <div className="superadmin-intro">
        <p className="section-kicker">Directory · {restaurant.slug}</p>
        <h1>{restaurant.name} settings</h1>
        <p>Manage the public identity and presentation for this restaurant.</p>
      </div>
      <div className="superadmin-detail-tabs" role="tablist">
        <Link role="tab" className="superadmin-detail-tab" activeOptions={{ exact: true }} activeProps={{ className: "superadmin-detail-tab active", "aria-selected": true }} inactiveProps={{ "aria-selected": false }} to="/admin/restaurant/$slug" params={{ slug: restaurant.slug }}>Menu</Link>
        <Link role="tab" className="superadmin-detail-tab" activeProps={{ className: "superadmin-detail-tab active", "aria-selected": true }} inactiveProps={{ "aria-selected": false }} to="/admin/restaurant/$slug/settings" params={{ slug: restaurant.slug }}>Settings</Link>
      </div>
      <SuperadminRestaurantSettings restaurant={restaurant} onSaved={refreshRestaurant} />
    </div>
  )
}
