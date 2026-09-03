import assert from 'node:assert/strict'
import test from 'node:test'
import app from '../server/index'

function fakeD1Auth() {
  const counters = new Map<string, { window_start: number; count: number }>()
  const respond = (sql: string, values: unknown[]) => ({
    run: async () => {
      if (sql.includes('INSERT INTO rate_limits')) {
        const [key, windowStart] = values as [string, number]
        const prev = counters.get(key)
        if (!prev || prev.window_start !== windowStart) counters.set(key, { window_start: windowStart, count: 1 })
        else prev.count += 1
      }
      return { meta: { changes: 0 } }
    },
    first: async () => {
      if (sql.includes('SELECT count FROM rate_limits')) return counters.get(values[0] as string) ?? null
      return null
    },
    all: async () => ({ results: [] }),
  })
  return {
    prepare(sql: string) {
      const direct = respond(sql, [])
      return {
        ...direct,
        bind(...values: unknown[]) { return respond(sql, values) },
      }
    },
    batch: async (stmts: unknown[]) => stmts,
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database
}

function fakeEnvAuth() {
  return {
    DB: fakeD1Auth(),
    MENU_IMAGES: { get: async () => null } as unknown as R2Bucket,
    ASSETS: { fetch: async () => new Response('<html>ssr</html>', { headers: { 'Content-Type': 'text/html' } }) } as unknown as Fetcher,
    PUBLIC_APP_URL: 'https://menu.example.com',
    BETTER_AUTH_SECRET: 'test-secret',
  }
}

// All admin / superadmin routes must reject unauthenticated callers.
// The fake D1 returns null for every session lookup, so better-auth
// resolves to no session and the handlers return 401.

test('GET /api/superadmin/me returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/me', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/superadmin/users returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/users', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/superadmin/waitlist returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/waitlist', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/admin/waitlist alias returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/admin/waitlist', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/superadmin/restaurants returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/restaurants', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})
test('PATCH /api/superadmin/restaurants/:id/owner returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/restaurants/restaurant-1/owner', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId: 'user-id' }),
  }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/admin/restaurants returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/admin/restaurants', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/admin/items returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/admin/items', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('POST /api/admin/publish returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/admin/publish', { method: 'POST' }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('POST /api/admin/unpublish returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/admin/unpublish', { method: 'POST' }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('GET /api/admin/images/* returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/admin/images/menu/r1/photo.png', undefined, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('POST /api/superadmin/broadcast returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience: 'waitlist', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' }),
  }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('POST /api/superadmin/restaurants returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/restaurants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'new-place', name: 'New Place', description: '', address: '', hours: '' }),
  }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('PATCH /api/superadmin/users/:id returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/users/some-id', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'superadmin' }),
  }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('DELETE /api/superadmin/users/:id returns 401 when unauthenticated', async () => {
  const res = await app.request('/api/superadmin/users/some-id', { method: 'DELETE' }, fakeEnvAuth())
  assert.equal(res.status, 401)
})

test('unauthenticated responses still carry hardening headers', async () => {
  const res = await app.request('/api/superadmin/me', undefined, fakeEnvAuth())
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY')
  assert.equal(res.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
})
