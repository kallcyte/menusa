import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '../features/app/AppShell'
import { fetchSession, fetchSuperadminMe } from '../api'

export const Route = createFileRoute('/admin')({
  // The browser session cookie is unavailable to relative fetches during SSR.
  // AppShell performs the authenticated client check; this guard only runs on client navigation.
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const session = await fetchSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export async function requireSuperadmin() {
  if (typeof window === 'undefined') return
  try {
    const me = await fetchSuperadminMe()
    if (me.user.role !== 'superadmin') throw redirect({ to: '/admin' })
  } catch (e: unknown) {
    if (e instanceof Response) throw e
    throw redirect({ to: '/admin' })
  }
}

export async function requireRestaurantUser() {
  if (typeof window === 'undefined') return
  try {
    const me = await fetchSuperadminMe()
    if (me.user.role === 'superadmin') throw redirect({ to: '/admin' })
  } catch (e: unknown) {
    if (e instanceof Response) throw e
    // A 401/403 means a regular authenticated user; the parent route checked auth.
  }
}
