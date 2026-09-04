import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { createSuperadminItem, fetchSuperadminItems, fetchSuperadminRestaurants, updateSuperadminItem } from "../../api"
import type { MenuItem } from "../../data"
import { useToast } from "../../components/ui/toast"
import { errorMessage } from "../shared"
import { MenuItemEditor } from "../workspace/MenuItemEditor"

export function SuperadminMenuItemPage({ itemId, restaurantId: requestedRestaurantId, returnTo }: { itemId?: string; restaurantId?: string; returnTo?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const restaurantsQuery = useQuery({ queryKey: ["superadmin", "restaurants"], queryFn: fetchSuperadminRestaurants, staleTime: 30_000 })
  const restaurants = restaurantsQuery.data?.restaurants ?? []
  const restaurant = restaurants.find((entry) => entry.id === requestedRestaurantId) ?? restaurants[0] ?? null
  const itemsQuery = useQuery({
    queryKey: ["superadmin", "items", restaurant?.id ?? "none"],
    queryFn: () => fetchSuperadminItems(restaurant!.id).then((result) => result.items),
    enabled: Boolean(restaurant),
    staleTime: 30_000,
  })
  const item = itemId ? itemsQuery.data?.find((entry) => entry.id === itemId) : undefined
  const backTo = returnTo?.startsWith("/admin/") ? returnTo : "/admin/restaurants"
  const goBack = () => void navigate({ to: backTo as never })

  if (restaurantsQuery.isPending || (restaurant && itemsQuery.isPending)) {
    return <div className="waitlist-loading">Loading menu editor…</div>
  }
  if (restaurantsQuery.isError || itemsQuery.isError) {
    return <div className="waitlist-error-panel">{errorMessage(restaurantsQuery.error ?? itemsQuery.error, "Couldn't load menu editor.")}</div>
  }
  if (!restaurant) {
    return <div className="waitlist-empty">No restaurant found for this menu.</div>
  }
  if (itemId && !item) {
    return (
      <div className="waitlist-error-panel">
        <p>Menu item not found.</p>
        <button className="button outline-button" onClick={goBack}>Back to restaurant</button>
      </div>
    )
  }

  const saveItem = async (nextItem: MenuItem) => {
    try {
      if (itemId) await updateSuperadminItem(restaurant.id, nextItem)
      else await createSuperadminItem(restaurant.id, nextItem)
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "items", restaurant.id] })
      toast({ title: itemId ? "Item updated" : "Item added" })
      return true
    } catch (err) {
      toast({ variant: "error", title: itemId ? "Couldn't update" : "Couldn't add item", description: errorMessage(err, "Please try again.") })
      return false
    }
  }

  return <MenuItemEditor initialItem={item} currency={restaurant.currency} onCancel={goBack} onSubmit={saveItem} superadminRestaurantId={restaurant.id} />
}
