import { createFileRoute } from '@tanstack/react-router'
import { requireRestaurantUser } from './admin'
import { PromosPanel } from '../features/workspace/PromosPanel'

export const Route = createFileRoute('/admin/promos')({ beforeLoad: requireRestaurantUser, component: AdminPromosRoute })

function AdminPromosRoute() {
  return <PromosPanel />
}
