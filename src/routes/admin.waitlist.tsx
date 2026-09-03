import { createFileRoute } from '@tanstack/react-router'
import { requireSuperadmin } from './admin'
import { WaitlistPanel } from '../features/workspace/WaitlistPanel'

export const Route = createFileRoute('/admin/waitlist')({
  beforeLoad: requireSuperadmin,
  component: () => <WaitlistPanel />,
})
