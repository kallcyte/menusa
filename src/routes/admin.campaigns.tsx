import { createFileRoute } from '@tanstack/react-router'
import { requireSuperadmin } from './admin'
import { CampaignsPanel } from '../features/superadmin/CampaignsPanel'

export const Route = createFileRoute('/admin/campaigns')({
  beforeLoad: requireSuperadmin,
  component: () => <CampaignsPanel />,
})
