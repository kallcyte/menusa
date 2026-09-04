import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchAdminItems, fetchAdminRestaurants } from "../../../api"
import { MenuItemEditor } from "../../workspace/MenuItemEditor"
import { errorMessage } from "../../shared"
import { makeAddItem, makeUpdateItem, type MutationDeps } from "../../workspace/mutations"
import { useToast } from "../../../components/ui/toast"

export function AdminMenuItemPage({ itemId, restaurantId: requestedRestaurantId }: { itemId?: string; restaurantId?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [published, setPublished] = useState(true)

  const restaurantsQuery = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const restaurants = restaurantsQuery.data?.restaurants ?? []
  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === requestedRestaurantId) ?? restaurants[0] ?? null
  const itemsQuery = useQuery({
    queryKey: ["admin", "items", selectedRestaurant?.id ?? "none"],
    queryFn: () => fetchAdminItems(selectedRestaurant!.id),
    enabled: Boolean(selectedRestaurant),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (selectedRestaurant) setPublished(selectedRestaurant.published === 1)
  }, [selectedRestaurant?.id, selectedRestaurant?.published])

  const deps: MutationDeps = {
    queryClient,
    restaurantId: selectedRestaurant?.id ?? requestedRestaurantId ?? "",
    slug: selectedRestaurant?.slug ?? "le-resto",
    published,
    setPublished,
    toast,
  }
  const saveItem = itemId ? makeUpdateItem(deps) : makeAddItem(deps)
  const item = itemId ? itemsQuery.data?.find((entry) => entry.id === itemId) : undefined

  if (restaurantsQuery.isPending || (selectedRestaurant && itemsQuery.isPending)) {
    return <div className="waitlist-loading">Memuat editor menu…</div>
  }
  if (restaurantsQuery.isError || itemsQuery.isError) {
    return <div className="waitlist-error-panel">{errorMessage(restaurantsQuery.error ?? itemsQuery.error, "Gagal memuat editor menu.")}</div>
  }
  if (!selectedRestaurant) {
    return <div className="waitlist-empty">Belum ada restoran untuk menu ini.</div>
  }
  if (itemId && !item) {
    return (
      <div className="waitlist-error-panel">
        <p>Item menu tidak ditemukan.</p>
        <button className="button outline-button" onClick={() => void navigate({ to: "/admin" })}>Kembali ke menu</button>
      </div>
    )
  }

  return (
    <MenuItemEditor
      initialItem={item}
      currency={selectedRestaurant.currency}
      onCancel={() => void navigate({ to: "/admin" })}
      onSubmit={saveItem}
    />
  )
}

