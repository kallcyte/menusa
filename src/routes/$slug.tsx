import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PublicMenu } from '../App'

export const Route = createFileRoute('/$slug')({ component: SlugRoute })

function SlugRoute() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()
  return <PublicMenu slug={slug} navigate={path => navigate({ to: path as never })} />
}
