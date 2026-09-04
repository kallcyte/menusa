import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchAdminItems, fetchAdminRestaurants, unpublishAdminMenu } from "../../../api"
import { errorMessage } from "../../shared"
import { makeItemActions, makePublishAll, makeReorderItem, makeReorderTo, makeRunItemAction, type MutationDeps } from "../../workspace/mutations"
import { MenuManager } from "../../workspace/MenuManager"
import { useToast } from "../../../components/ui/toast"

export function AdminMenuPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [published, setPublished] = useState(true)
  const [restaurantId, setRestaurantId] = useState("")

  const restaurantsQuery = useQuery({ queryKey: ["admin", "restaurants"], queryFn: fetchAdminRestaurants, staleTime: 30_000 })
  const ownedRestaurants = restaurantsQuery.data?.restaurants ?? []
  const selectedRestaurant = ownedRestaurants.find((r) => r.id === restaurantId) ?? ownedRestaurants[0] ?? null

  useEffect(() => {
    if (ownedRestaurants[0] && !ownedRestaurants.some((r) => r.id === restaurantId)) setRestaurantId(ownedRestaurants[0].id)
  }, [ownedRestaurants, restaurantId])
  useEffect(() => {
    if (selectedRestaurant) setPublished(selectedRestaurant.published === 1)
  }, [selectedRestaurant?.id, selectedRestaurant?.published])

  const itemsQuery = useQuery({
    queryKey: ["admin", "items", selectedRestaurant?.id ?? "none"],
    queryFn: () => fetchAdminItems(selectedRestaurant!.id),
    enabled: Boolean(selectedRestaurant),
    staleTime: 30_000,
  })
  const items = itemsQuery.data ?? []
  const deps: MutationDeps = { queryClient, restaurantId: selectedRestaurant?.id ?? restaurantId, slug: selectedRestaurant?.slug ?? "le-resto", published, setPublished, toast }
  const runItemAction = makeRunItemAction(deps)
  const itemActions = makeItemActions(deps, runItemAction)
  const publishAll = makePublishAll(deps)
  const reorderTo = makeReorderTo(deps)
  const reorderItem = makeReorderItem(deps)

  if (!selectedRestaurant) {
    if (restaurantsQuery.isPending) return <div className="waitlist-loading">Memuat restoran…</div>
    return (
      <div className="waitlist-empty">
        <h3>Belum ada restoran</h3>
        <p>Buat restoran pertama untuk mulai membangun menu.</p>
      </div>
    )
  }

  return (
    <MenuManager
      items={items}
      currency={selectedRestaurant.currency}
      onAdd={() => void navigate({ to: "/admin/add", search: { restaurantId: selectedRestaurant.id } as never })}
      onEdit={(item) => void navigate({ to: "/admin/edit/$itemId", params: { itemId: item.id }, search: { restaurantId: selectedRestaurant.id } as never })}
      onArchive={itemActions.archive}
      onRestore={itemActions.restore}
      onPublishItem={itemActions.publish}
      onDraftItem={itemActions.draft}
      onReorder={reorderItem}
      onReorderTo={reorderTo}
      onPublish={publishAll}
      onUnpublish={async () => {
        if (!selectedRestaurant) return false
        try {
          await unpublishAdminMenu(selectedRestaurant.id)
          setPublished(false)
          queryClient.invalidateQueries({ queryKey: ["admin", "restaurants"] })
          queryClient.invalidateQueries({ queryKey: ["public-menu", selectedRestaurant.slug] })
          toast({ title: "Menu disembunyikan", description: "Menu publik sekarang tidak terlihat." })
          return true
        } catch (err) {
          toast({ variant: "error", title: "Gagal menyembunyikan", description: errorMessage(err, "Coba lagi.") })
          return false
        }
      }}
      published={published}
      loading={itemsQuery.isFetching}
      loadingInitial={itemsQuery.isPending && !itemsQuery.error}
      loadError={itemsQuery.error instanceof Error ? itemsQuery.error.message : null}
      onRetry={() => itemsQuery.refetch()}
    />
  )

}
