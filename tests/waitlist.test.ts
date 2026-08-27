import assert from 'node:assert/strict'
import test from 'node:test'
import app from '../server/index'
import { waitlistSchema } from '../server/schemas'

// ---------------------------------------------------------------------------
// waitlistSchema — validation
// ---------------------------------------------------------------------------

test('waitlistSchema lowercases and trims email', () => {
  const result = waitlistSchema.safeParse({ email: 'Foo@Example.COM' })
  assert.equal(result.success, true)
  if (result.success) assert.equal(result.data.email, 'foo@example.com')
})

test('waitlistSchema rejects invalid email', () => {
  assert.equal(waitlistSchema.safeParse({ email: 'not-an-email' }).success, false)
  assert.equal(waitlistSchema.safeParse({ email: '' }).success, false)
})

test('waitlistSchema rejects email longer than 254 chars', () => {
  const long = 'a'.repeat(250) + '@b.co'
  assert.equal(waitlistSchema.safeParse({ email: long }).success, false)
})

test('waitlistSchema trims restaurantName and drops empty string', () => {
  const r1 = waitlistSchema.safeParse({ email: 'a@b.co', restaurantName: '  Alba House  ' })
  assert.equal(r1.success, true)
  if (r1.success) assert.equal(r1.data.restaurantName, 'Alba House')

  const r2 = waitlistSchema.safeParse({ email: 'a@b.co', restaurantName: '   ' })
  assert.equal(r2.success, true)
  if (r2.success) assert.equal(r2.data.restaurantName, undefined)

  const r3 = waitlistSchema.safeParse({ email: 'a@b.co' })
  assert.equal(r3.success, true)
  if (r3.success) assert.equal(r3.data.restaurantName, undefined)
})

test('waitlistSchema rejects restaurantName longer than 120 chars', () => {
  assert.equal(waitlistSchema.safeParse({ email: 'a@b.co', restaurantName: 'x'.repeat(121) }).success, false)
})

// ---------------------------------------------------------------------------
// POST /api/waitlist — endpoint
// ---------------------------------------------------------------------------

function fakeD1Waitlist(opts: { existingEmails?: Set<string> } = {}) {
  const existing = opts.existingEmails ?? new Set<string>()
  const counters = new Map<string, { window_start: number; count: number }>()
  const respond = (sql: string, values: unknown[]) => ({
    run: async () => {
      if (sql.includes('INSERT INTO rate_limits')) {
        const [key, windowStart] = values as [string, number]
        const prev = counters.get(key)
        if (!prev || prev.window_start !== windowStart) counters.set(key, { window_start: windowStart, count: 1 })
        else prev.count += 1
        return {}
      }
      if (sql.includes('INSERT INTO waitlist')) {
        const [email] = values as [string, unknown]
        if (existing.has(email as string)) throw new Error('UNIQUE constraint failed: waitlist.email')
        existing.add(email as string)
        return {}
      }
      return {}
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
      return { ...direct, bind(...values: unknown[]) { return respond(sql, values) } }
    },
    batch: async (stmts: unknown[]) => stmts,
    exec: async () => ({ count: 0, duration: 0 }),
    _counters: counters,
    _existing: existing,
  } as unknown as D1Database
}

function fakeEnvWaitlist(existing?: Set<string>) {
  return {
    DB: fakeD1Waitlist({ existingEmails: existing }),
    MENU_IMAGES: { get: async () => null } as unknown as R2Bucket,
    ASSETS: { fetch: async () => new Response('ssr') } as unknown as Fetcher,
    PUBLIC_APP_URL: 'https://menu.example.com',
    BETTER_AUTH_SECRET: 'test-secret',
  }
}

const execCtx = { waitUntil: (p: Promise<unknown>) => p.catch(() => {}) } as unknown as ExecutionContext

test('POST /api/waitlist creates entry and returns 201', async () => {
  const env = fakeEnvWaitlist()
  const res = await app.request('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'new@example.com', restaurantName: 'Alba House' }),
  }, env as never, execCtx as never)
  assert.equal(res.status, 201)
  const body = await res.json() as { ok: boolean; already?: boolean }
  assert.equal(body.ok, true)
  assert.equal(body.already, undefined)
})

test('POST /api/waitlist returns 200 with already flag for duplicate email', async () => {
  const existing = new Set(['dup@example.com'])
  const env = fakeEnvWaitlist(existing)
  const res = await app.request('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dup@example.com' }),
  }, env as never, execCtx as never)
  assert.equal(res.status, 200)
  const body = await res.json() as { ok: boolean; already?: boolean }
  assert.equal(body.ok, true)
  assert.equal(body.already, true)
})

test('POST /api/waitlist returns 400 for invalid email', async () => {
  const env = fakeEnvWaitlist()
  const res = await app.request('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  }, env as never, execCtx as never)
  assert.equal(res.status, 400)
})

test('POST /api/waitlist is rate-limited after 5 attempts per hour', async () => {
  const env = fakeEnvWaitlist()
  const headers = { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.99' }
  let last: Response | undefined
  for (let i = 0; i < 6; i++) {
    last = await app.request('/api/waitlist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: `user${i}@example.com` }),
    }, env as never, execCtx as never)
  }
  assert.equal(last?.status, 429)
  const body = await last!.json() as { error: string }
  assert.match(body.error, /Too many attempts/)
})

test('POST /api/waitlist hardening headers are present', async () => {
  const env = fakeEnvWaitlist()
  const res = await app.request('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headers@example.com' }),
  }, env as never, execCtx as never)
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY')
})
