import { createFileRoute } from '@tanstack/react-router'
import { MenuItemRoutePage } from '../features/app/pages/MenuItemRoutePage'

export const Route = createFileRoute('/admin/edit/$itemId')({
  validateSearch: (search: Record<string, unknown>) => ({
    restaurantId: typeof search.restaurantId === 'string' ? search.restaurantId : undefined,
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  component: AdminEditMenuItemRoute,
})

function AdminEditMenuItemRoute() {
  const { itemId } = Route.useParams()
  const { restaurantId, returnTo } = Route.useSearch()
  return <MenuItemRoutePage itemId={itemId} restaurantId={restaurantId} returnTo={returnTo} />
}
