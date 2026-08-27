import assert from 'node:assert/strict'
import test from 'node:test'
import app from '../server/index'

/** In-memory D1 stub covering the queries the API worker issues in these tests. */
function fakeD1(options: { publishedImages?: Set<string>; sitemapRows?: Array<{ slug: string; updated_at: string }> } = {}) {
  const counters = new Map<string, { window_start: number; count: number }>()
  const respond = (sql: string, values: unknown[]) => ({
    run: async () => {
      if (sql.includes('INSERT INTO rate_limits')) {
        const [key, windowStart] = values as [string, number]
        const existing = counters.get(key)
        if (!existing || existing.window_start !== windowStart) counters.set(key, { window_start: windowStart, count: 1 })
        else existing.count += 1
      }
      return {}
    },
    first: async () => {
      if (sql.includes('SELECT count FROM rate_limits')) return counters.get(values[0] as string) ?? null
      if (sql.includes('JOIN restaurants r')) return ((options.publishedImages?.has(values[0] as string)) ?? false) ? { 1: 1 } : null
      return null
    },
    all: async () => ({
      results: sql.includes('FROM restaurants WHERE published = 1') ? options.sitemapRows ?? [] : [],
    }),
  })
  return {
    prepare(sql: string) {
      const direct = respond(sql, [])
      return {
        ...direct,
        bind(...values: unknown[]) {
          return respond(sql, values)
        },
      }
    },
  } as unknown as D1Database
}

function fakeEnv(dbOverrides: Parameters<typeof fakeD1>[0] = {}) {
  return {
    DB: fakeD1(dbOverrides),
    MENU_IMAGES: {
      get: async (key: string) => ({
        body: `bytes-for:${key}`,
        httpMetadata: { contentType: 'image/png' },
        httpEtag: '"etag-1"',
      }),
    } as unknown as R2Bucket,
    ASSETS: { fetch: async () => new Response('<html>ssr app</html>', { headers: { 'Content-Type': 'text/html' } }) } as unknown as Fetcher,
    PUBLIC_APP_URL: 'https://menu.example.com',
    BETTER_AUTH_SECRET: 'test-secret',
  }
}

test('API responses carry hardening headers', async () => {
  // Use a real API route (invalid image key) — the 400 response still
  // carries the hardening headers set by the /api/* middleware.
  const res = await app.request('/api/images/other/pic.png', undefined, fakeEnv())
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY')
  assert.equal(res.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
})

test('image keys outside the menu/ prefix are rejected', async () => {
  const res = await app.request('/api/images/other/pic.png', undefined, fakeEnv())
  assert.equal(res.status, 400)
})

test('images not referenced by a published item are not served', async () => {
  const res = await app.request(`/api/images/${encodeURIComponent('menu/r1/secret.png')}`, undefined, fakeEnv())
  assert.equal(res.status, 404)
})

test('published menu images are served from R2 with cache headers', async () => {
  const env = fakeEnv({ publishedImages: new Set(['menu/r1/live.png']) })
  const res = await app.request(`/api/images/${encodeURIComponent('menu/r1/live.png')}`, undefined, env)
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'bytes-for:menu/r1/live.png')
  assert.equal(res.headers.get('Content-Type'), 'image/png')
  assert.match(res.headers.get('Cache-Control') ?? '', /immutable/)
})

test('sign-in is rate-limited after repeated attempts from one IP', async () => {
  const env = fakeEnv()
  const headers = { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.9' }
  let lastResponse: Response | undefined
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      lastResponse = await app.request('/api/auth/sign-in/email', { method: 'POST', headers, body: JSON.stringify({ email: 'a@b.c', password: 'nope' }) }, env)
    } catch {
      // better-auth internals may reject against the stubbed DB before the
      // limiter trips; only the final verdict matters for this assertion.
    }
  }
  assert.equal(lastResponse?.status, 429)
})

test('sitemap lists the home page and published restaurant slugs', async () => {
  const env = fakeEnv({ sitemapRows: [{ slug: 'salt-ember', updated_at: '2026-01-02T00:00:00Z' }] })
  const res = await app.request('/sitemap.xml', undefined, env)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('Content-Type') ?? '', /xml/)
  const body = await res.text()
  assert.match(body, /<loc>https:\/\/menu\.example\.com\/<\/loc>/)
  assert.match(body, /<loc>https:\/\/menu\.example\.com\/salt-ember<\/loc>/)
  assert.match(body, /<lastmod>2026-01-02T00:00:00Z<\/lastmod>/)
})

test('non-API paths fall through to the SSR assets worker', async () => {
  const res = await app.request('/some-page', undefined, fakeEnv())
  assert.equal(res.status, 200)
  assert.equal(await res.text(), '<html>ssr app</html>')
})
