import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ToastProvider } from '../components/ui/toast'
import '../i18n'
import '../styles.css'
import '../account-settings.css'
import favicon from '../assets/menusa-favicon.svg'
import appleTouchIcon from '../assets/menusa-apple-touch-icon.svg'
import iconLogo from '../assets/menusa-icon.svg'

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

function PageLoader() {
  const [exiting, setExiting] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const startedAt = Date.now()
    let finished = false
    let exitTimer: number | undefined
    let removeTimer: number | undefined

    const finish = () => {
      if (finished) return
      finished = true
      const minimumDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 550
      const delay = Math.max(0, minimumDuration - (Date.now() - startedAt))
      exitTimer = window.setTimeout(() => {
        setExiting(true)
        removeTimer = window.setTimeout(() => setVisible(false), 260)
      }, delay)
    }

    const fallbackTimer = window.setTimeout(finish, 1800)
    if (document.readyState === 'complete') finish()
    else window.addEventListener('load', finish, { once: true })

    return () => {
      finished = true
      window.clearTimeout(fallbackTimer)
      if (exitTimer !== undefined) window.clearTimeout(exitTimer)
      if (removeTimer !== undefined) window.clearTimeout(removeTimer)
      window.removeEventListener('load', finish)
    }
  }, [])

  if (!visible) return null

  return (
    <div className={`page-loader${exiting ? ' page-loader--exiting' : ''}`} role="status" aria-label="Loading Menusa">
      <div className="page-loader-inner">
        <img src={iconLogo} alt="" className="page-loader-icon" />
        <div className="page-loader-track" aria-hidden="true">
          <span className="page-loader-progress" />
        </div>
      </div>
    </div>
  )
}

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
  return (
    <html lang="id">
      <head><HeadContent /></head>
      <body>
        <PageLoader />
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}

export function RouteError({ error }: { error: Error }) {
  return <main className="route-error"><h1>Something went wrong.</h1><p>{error.message}</p></main>
}

export function DocumentSlot({ children }: { children: ReactNode }) { return children }
