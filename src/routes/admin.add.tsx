import { createFileRoute } from '@tanstack/react-router'
import { MenuItemRoutePage } from '../features/app/pages/MenuItemRoutePage'

export const Route = createFileRoute('/admin/add')({
  validateSearch: (search: Record<string, unknown>) => ({
    restaurantId: typeof search.restaurantId === 'string' ? search.restaurantId : undefined,
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  component: AdminAddMenuItemRoute,
})

function AdminAddMenuItemRoute() {
  const { restaurantId, returnTo } = Route.useSearch()
  return <MenuItemRoutePage restaurantId={restaurantId} returnTo={returnTo} />
}
