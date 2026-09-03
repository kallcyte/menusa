import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AccountSettingsPanel } from '../features/auth/AccountSettingsPanel'
import { fetchSession } from '../api'

export const Route = createFileRoute('/admin/account-settings')({ component: AdminAccountRoute })

function AdminAccountRoute() {
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ["auth", "session"], queryFn: fetchSession, staleTime: 30_000 })
  return <AccountSettingsPanel user={q.data?.user as never} onDeleted={() => navigate({ to: "/login" })} />
}
