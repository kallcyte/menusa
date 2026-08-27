import assert from 'node:assert/strict'
import test from 'node:test'
import { sniffImageType } from '../server/images'
import { checkRateLimit, clientIp } from '../server/rate-limit'

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const webp = new Uint8Array([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBP')])
const html = new TextEncoder().encode('<script>alert(1)</script>')

test('sniffs JPEG magic bytes', () => {
  assert.equal(sniffImageType(jpeg), 'image/jpeg')
})

test('sniffs PNG magic bytes', () => {
  assert.equal(sniffImageType(png), 'image/png')
})

test('sniffs WebP RIFF container', () => {
  assert.equal(sniffImageType(webp), 'image/webp')
})

test('rejects non-image content like HTML payloads', () => {
  assert.equal(sniffImageType(html), null)
})

test('rejects truncated headers', () => {
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8])), null)
})

test('clientIp prefers cf-connecting-ip and falls back through hop headers', () => {
  assert.equal(clientIp(new Headers({ 'cf-connecting-ip': '203.0.113.7' })), '203.0.113.7')
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.2, 10.0.0.1' })), '198.51.100.2')
  assert.equal(clientIp(new Headers()), 'unknown')
})

/** Minimal D1 stand-in implementing just the upsert + select the limiter issues. */
function fakeD1(options: { throwOnPrepare?: boolean } = {}) {
  const store = new Map<string, { window_start: number; count: number }>()
  const db = {
    prepare(sql: string) {
      if (options.throwOnPrepare) throw new Error('d1 unavailable')
      return {
        bind(...values: unknown[]) {
          const [key, windowStart] = values as [string, number]
          if (sql.includes('INSERT')) {
            return {
              run: async () => {
                const existing = store.get(key)
                if (!existing || existing.window_start !== windowStart) store.set(key, { window_start: windowStart, count: 1 })
                else existing.count += 1
                return {}
              },
              first: async () => null,
            }
          }
          return {
            run: async () => ({}),
            first: async () => store.get(key) ?? null,
          }
        },
      }
    },
  } as unknown as D1Database
  return { db, store }
}

test('checkRateLimit allows requests under the limit', async () => {
  const { db } = fakeD1()
  for (let i = 0; i < 5; i++) {
    assert.equal(await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 60_000), true)
  }
})

test('checkRateLimit blocks once the limit is exceeded', async () => {
  const { db } = fakeD1()
  for (let i = 0; i < 5; i++) await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 60_000)
  assert.equal(await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 60_000), false)
})

test('checkRateLimit resets when the window rolls over', async () => {
  const { db } = fakeD1()
  for (let i = 0; i < 5; i++) await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 60_000)
  assert.equal(await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 60_000), false)
  // Same key, different window start -> counter restarts at 1.
  assert.equal(await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 30_000), true)
})

test('checkRateLimit fails open when the database errors', async () => {
  const { db } = fakeD1({ throwOnPrepare: true })
  assert.equal(await checkRateLimit({ DB: db }, 'signin:1.2.3.4', 5, 60_000), true)
})
