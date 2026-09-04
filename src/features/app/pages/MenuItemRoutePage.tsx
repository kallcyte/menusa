import { useQuery } from "@tanstack/react-query"
import { fetchSuperadminMe } from "../../../api"
import { AdminMenuItemPage } from "./AdminMenuItemPage"
import { SuperadminMenuItemPage } from "../../superadmin/SuperadminMenuItemPage"

export function MenuItemRoutePage({ itemId, restaurantId, returnTo }: { itemId?: string; restaurantId?: string; returnTo?: string }) {
  const roleQuery = useQuery({ queryKey: ["superadmin", "me"], queryFn: fetchSuperadminMe, staleTime: 30_000, retry: false })

  if (roleQuery.isPending) return <div className="waitlist-loading">Memuat editor menu…</div>
  if (roleQuery.data?.user.role === "superadmin") {
    return <SuperadminMenuItemPage itemId={itemId} restaurantId={restaurantId} returnTo={returnTo} />
  }
  return <AdminMenuItemPage itemId={itemId} restaurantId={restaurantId} />
}
