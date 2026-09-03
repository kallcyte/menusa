import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { PromosPanel } from '../features/workspace/PromosPanel'

export const Route = createFileRoute('/app/promos')({ component: AppPromosRoute })

function AppPromosRoute() {
  return (
    <AppShell>
      <PromosPanel />
    </AppShell>
  )
}
