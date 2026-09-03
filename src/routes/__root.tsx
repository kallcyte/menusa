import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ToastProvider } from '../components/ui/toast'
import '../i18n'
import '../styles.css'
import '../account-settings.css'
import favicon from '../assets/menusa-favicon.svg'
import appleTouchIcon from '../assets/menusa-apple-touch-icon.svg'

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
    ],
    links: [
      { rel: 'icon', href: favicon, type: 'image/svg+xml' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: appleTouchIcon },
    ],
    scripts: [{ children: swRegisterScript, type: 'module' }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  useEffect(() => {
    const sync = () => {
      const lng = (typeof window !== 'undefined' && localStorage.getItem('menusa-lng')) || 'id'
      document.documentElement.lang = lng.startsWith('en') ? 'en' : 'id'
    }
    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return <html lang="id"><head><HeadContent /></head><body><QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider><Scripts /></body></html>
}

export function RouteError({ error }: { error: Error }) {
  return <main className="route-error"><h1>Something went wrong.</h1><p>{error.message}</p></main>
}

export function DocumentSlot({ children }: { children: ReactNode }) { return children }
