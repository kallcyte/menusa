// menusa service worker — deliberately conservative.
// Caches only immutable assets: R2 menu images and hashed /assets/* files.
// HTML and API responses always go to the network so deploys are picked up
// immediately and auth/admin pages never serve stale shells.
const CACHE = 'menusa-static-v1'
const MAX_ENTRIES = 120

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    if (cache.size > MAX_ENTRIES) {
      const first = await cache.keys()
      if (first.length >= MAX_ENTRIES) await cache.delete(first[0])
    }
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  // Menu images from the API worker's R2 endpoint.
  if (url.pathname.startsWith('/api/images/')) {
    event.respondWith(cacheFirst(event.request).catch(() => caches.match(event.request)))
    return
  }
  // Hashed build assets are safe to cache forever.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request))
  }
  // Everything else (HTML, /api/auth, /api/menu, admin routes) hits the network.
})
