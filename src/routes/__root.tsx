import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ToastProvider } from '../components/ui/toast'
import '../styles.css'
import '../account-settings.css'

// Registered from an inline module so it never blocks hydration; only ever
// activates over HTTPS or localhost (the browser enforces this for SW APIs).
const swRegisterScript = `if (location.protocol === 'https:' || location.hostname === 'localhost') {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#f3f2ed' },
      { name: 'description', content: 'Beautiful menus for places worth finding.' },
      { httpEquiv: 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
    ],
    links: [
      { rel: 'icon', href: 'data:,' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icon.svg' },
    ],
    scripts: [{ children: swRegisterScript, type: 'module' }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <html lang="en"><head><HeadContent /></head><body><QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider><Scripts /></body></html>
}

export function RouteError({ error }: { error: Error }) {
  return <main className="route-error"><h1>Something went wrong.</h1><p>{error.message}</p></main>
}

export function DocumentSlot({ children }: { children: ReactNode }) { return children }
