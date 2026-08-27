import assert from 'node:assert/strict'
import test from 'node:test'
import app from '../server/index'

function fakeD1Public(opts: {
  restaurant?: { id: string; slug: string; name: string; description: string; address: string; hours: string } | null
  items?: Array<Record<string, unknown>>
  sitemapRows?: Array<{ slug: string; updated_at: string }>
} = {}) {
  const counters = new Map<string, { window_start: number; count: number }>()
  const respond = (sql: string, values: unknown[]) => ({
    run: async () => {
      if (sql.includes('INSERT INTO rate_limits')) {
        const [key, windowStart] = values as [string, number]
        const prev = counters.get(key)
        if (!prev || prev.window_start !== windowStart) counters.set(key, { window_start: windowStart, count: 1 })
        else prev.count += 1
      }
      return {}
    },
    first: async () => {
      if (sql.includes('SELECT count FROM rate_limits')) return counters.get(values[0] as string) ?? null
      if (sql.includes('FROM restaurants WHERE slug = ? AND published = 1')) {
        if (opts.restaurant === null) return null
        if (opts.restaurant) return opts.restaurant
        return null
      }
      if (sql.includes('JOIN restaurants r')) return null
      return null
    },
    all: async () => {
      if (sql.includes("FROM menu_items WHERE restaurant_id")) return { results: opts.items ?? [] }
      if (sql.includes('FROM restaurants WHERE published = 1')) return { results: opts.sitemapRows ?? [] }
      return { results: [] }
    },
  })
  return {
    prepare(sql: string) {
      const direct = respond(sql, [])
      return { ...direct, bind(...values: unknown[]) { return respond(sql, values) } }
    },
    batch: async (stmts: unknown[]) => stmts,
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database
}

function fakeEnvPublic(overrides: Parameters<typeof fakeD1Public>[0] = {}) {
  return {
    DB: fakeD1Public(overrides),
    MENU_IMAGES: { get: async () => null } as unknown as R2Bucket,
    ASSETS: { fetch: async () => new Response('<html>ssr</html>', { headers: { 'Content-Type': 'text/html' } }) } as unknown as Fetcher,
    PUBLIC_APP_URL: 'https://menu.example.com',
    BETTER_AUTH_SECRET: 'test-secret',
  }
}

test('GET /api/menu/:slug returns 404 when restaurant not found', async () => {
  const env = fakeEnvPublic({ restaurant: null })
  const res = await app.request('/api/menu/unknown-slug', undefined, env)
  assert.equal(res.status, 404)
  const body = await res.json() as { error: string }
  assert.match(body.error, /not found/i)
})

test('GET /api/menu/:slug returns 404 for unpublished restaurant', async () => {
  const env = fakeEnvPublic({ restaurant: null })
  const res = await app.request('/api/menu/draft-restaurant', undefined, env)
  assert.equal(res.status, 404)
})

test('GET /api/menu/:slug returns restaurant and published items', async () => {
  const env = fakeEnvPublic({
    restaurant: { id: 'r1', slug: 'salt-ember', name: 'Salt & Ember', description: 'Shoreline menu', address: '14 Harbour Lane', hours: 'Open until 11 PM' },
    items: [
      { id: 'i1', name: 'Charred octopus', description: 'Saffron potato', price: 18, category: 'From the sea', imageKey: null, tag: null, status: 'PUBLISHED', ingredients: '', allergens: '[]', mayContain: '[]', dietaryTags: '[]', halalStatus: 'UNKNOWN', spiceLevel: null },
      { id: 'i2', name: 'Miso aubergine', description: 'Sesame', price: 16, category: 'Small plates', imageKey: null, tag: 'Plant-based', status: 'PUBLISHED', ingredients: 'Aubergine, miso', allergens: '["soya"]', mayContain: '[]', dietaryTags: '["VEGAN"]', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
    ],
  })
  const res = await app.request('/api/menu/salt-ember', undefined, env)
  assert.equal(res.status, 200)
  const body = await res.json() as { restaurant: Record<string, unknown>; items: Array<Record<string, unknown>> }
  assert.equal(body.restaurant.slug, 'salt-ember')
  assert.equal(body.restaurant.name, 'Salt & Ember')
  // owner id must not leak
  assert.equal((body.restaurant as Record<string, unknown>).owner_id, undefined)
  assert.equal((body.restaurant as Record<string, unknown>).id, undefined)
  assert.equal(body.items.length, 2)
  assert.equal(body.items[0].name, 'Charred octopus')
})

test('GET /api/menu/:slug normalizes allergens and dietary tags from JSON strings', async () => {
  const env = fakeEnvPublic({
    restaurant: { id: 'r1', slug: 'test', name: 'Test', description: '', address: '', hours: '' },
    items: [
      { id: 'i1', name: 'Dish', description: '', price: 10, category: 'Mains', imageKey: null, tag: null, status: 'PUBLISHED', ingredients: 'Tomato, basil', allergens: '["celery","milk"]', mayContain: '["nuts"]', dietaryTags: '["VEGAN"]', halalStatus: 'UNKNOWN', spiceLevel: null },
    ],
  })
  const res = await app.request('/api/menu/test', undefined, env)
  assert.equal(res.status, 200)
  const body = await res.json() as { items: Array<Record<string, unknown>> }
  assert.deepEqual(body.items[0].allergens, ['celery', 'milk'])
  assert.deepEqual(body.items[0].mayContain, ['nuts'])
  assert.deepEqual(body.items[0].dietaryTags, ['VEGAN'])
  assert.equal(body.items[0].ingredients, 'Tomato, basil')
})

test('GET /api/menu/:slug hardening headers are present even on 404', async () => {
  const env = fakeEnvPublic({ restaurant: null })
  const res = await app.request('/api/menu/missing', undefined, env)
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY')
})

test('GET /sitemap.xml includes published slugs with correct content-type', async () => {
  const env = fakeEnvPublic({ sitemapRows: [{ slug: 'alba-house', updated_at: '2026-02-01T00:00:00Z' }, { slug: 'salt-ember', updated_at: '2026-01-15T00:00:00Z' }] })
  // Need a D1 that returns sitemap rows for the sitemap query
  const db = fakeD1Public({ sitemapRows: [{ slug: 'alba-house', updated_at: '2026-02-01T00:00:00Z' }] })
  const env2 = { ...env, DB: db }
  const res = await app.request('/sitemap.xml', undefined, env2)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('Content-Type') ?? '', /xml/)
  const body = await res.text()
  assert.match(body, /alba-house/)
})

test('GET /sitemap.xml with no published restaurants still returns valid xml', async () => {
  const env = fakeEnvPublic({ sitemapRows: [] })
  const res = await app.request('/sitemap.xml', undefined, env)
  assert.equal(res.status, 200)
  const body = await res.text()
  assert.match(body, /<urlset/)
  assert.match(body, /<loc>https:\/\/menu\.example\.com\/<\/loc>/)
})
