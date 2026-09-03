import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { AccountSettingsPanel } from '../features/auth/AccountSettingsPanel'
import { useQuery } from '@tanstack/react-query'
import { fetchSession } from '../api'

export const Route = createFileRoute('/app/account-settings')({ component: AppAccountRoute })

function AppAccountRoute() {
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ["auth", "session"], queryFn: fetchSession, staleTime: 30_000 })
  return (
    <AppShell>
      <AccountSettingsPanel user={q.data?.user as never} onDeleted={() => navigate({ to: "/login" })} />
    </AppShell>
  )
}
