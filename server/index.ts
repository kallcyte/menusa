/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword } from 'better-auth/crypto'
import { createAuth } from './auth'
import { createRestaurantSchema, menuItemSchema, restaurantSettingsSchema, waitlistSchema } from './schemas'
import { checkRateLimit, clientIp } from './rate-limit'
import { sniffImageType } from './images'
import { sendDemotionEmail, sendPromotionEmail, sendWaitlistConfirmation } from './email'


type Env = { Bindings: { DB: D1Database; MENU_IMAGES: R2Bucket; ASSETS: Fetcher; PUBLIC_APP_URL: string; BETTER_AUTH_SECRET: string; SUPERADMIN_EMAIL?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string } }
const app = new Hono<Env>()

// Hardening headers for every API response. CSP is intentionally deferred to the
// web worker where the TanStack SSR inline scripts can carry a proper nonce.
app.use('/api/*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  await next()
})

function requestOrigin(c: { req: { url: string } }) {
  return new URL(c.req.url).origin
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function imageResponse(object: R2ObjectBody) {
  return new Response(object.body, { headers: { 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream', ETag: object.httpEtag } })
}

function normalizeMenuItem(row: Record<string, unknown>) {
  return {
    ...row,
    imageKey: typeof row.imageKey === 'string' ? row.imageKey : undefined,
    ingredients: typeof row.ingredients === 'string' ? row.ingredients : '',
    dietaryTags: parseJsonArray(row.dietaryTags),
    halalStatus: row.halalStatus || 'UNKNOWN',
    spiceLevel: typeof row.spiceLevel === 'string' && row.spiceLevel !== 'null' ? row.spiceLevel : undefined,
    isSpecial: Boolean(row.is_special ?? row.isSpecial),
  }
}

async function getOwnedRestaurant(c: { env: Env["Bindings"]; req: { query: (k: string) => string | undefined; raw: { headers: Headers } } }) {
  const auth = createAuth(c.env.DB, requestOrigin(c as unknown as { req: { url: string } }), c.env.BETTER_AUTH_SECRET)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return null
  const userId = (session.user as unknown as { id: string }).id
  const requestedId = c.req.query('restaurantId')
  if (requestedId) {
    const row = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ? AND (owner_id = ? OR id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = ?)) LIMIT 1').bind(requestedId, userId, userId).first() as { id: string } | null
    return row
  }
  const row = await c.env.DB.prepare('SELECT id FROM restaurants WHERE owner_id = ? OR id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = ?) ORDER BY created_at ASC LIMIT 1').bind(userId, userId).first() as { id: string } | null
  return row
}

function authWithEmail(c: { env: Env["Bindings"] }, origin: string) {
  return createAuth(c.env.DB, origin, c.env.BETTER_AUTH_SECRET, {
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      const { sendVerificationEmail } = await import("./email")
      const r = await sendVerificationEmail(c.env, user.email, url)
      if (!r.ok && !r.skipped) console.error("[email] verification failed", r.error)
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      const { sendPasswordResetEmail } = await import("./email")
      const r = await sendPasswordResetEmail(c.env, user.email, url)
      if (!r.ok && !r.skipped) console.error("[email] reset failed", r.error)
    },
  })
}

async function getSessionAndRole(c: { env: Env["Bindings"]; req: { raw: { headers: Headers }; url: string } }) {
  const auth = createAuth(c.env.DB, requestOrigin(c as unknown as { req: { url: string } }), c.env.BETTER_AUTH_SECRET)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return { session: null, role: null as string | null }
  const user = session.user as unknown as { id: string; email: string; role?: string }
  let role = user.role ?? "user"
  if (c.env.SUPERADMIN_EMAIL && user.email === c.env.SUPERADMIN_EMAIL && role !== "superadmin") {
    await c.env.DB.prepare("UPDATE user SET role = 'superadmin' WHERE id = ?").bind(user.id).run()
    role = "superadmin"
  }
  return { session, role }
}

// Brute-force guard for credential sign-in. Must register above the auth
// catch-all below, since Hono matches handlers in registration order.
app.post('/api/auth/sign-in/email', async c => {
  const allowed = await checkRateLimit(c.env, `signin:${clientIp(c.req.raw.headers)}`, 10, 60_000)
  if (!allowed) return c.json({ error: 'Too many sign-in attempts. Try again shortly.' }, 429)
  const auth = authWithEmail(c, requestOrigin(c))
  return auth.handler(c.req.raw)
})

app.on(['GET', 'POST'], '/api/auth/*', c => {
  const auth = authWithEmail(c, requestOrigin(c))
  return auth.handler(c.req.raw)
})

// Better Auth should be mounted here once the deployment secrets are configured.
// Keeping auth behind /api/auth makes the client independent of the auth provider.
// Waitlist — public join, rate-limited per IP
app.post('/api/waitlist', zValidator('json', waitlistSchema), async (c) => {
  const allowed = await checkRateLimit(c.env, `waitlist:${clientIp(c.req.raw.headers)}`, 5, 60 * 60 * 1000)
  if (!allowed) return c.json({ error: 'Too many attempts. Try again later.' }, 429)
  const { email, restaurantName } = c.req.valid('json')
  let already = false
  try {
    await c.env.DB.prepare('INSERT INTO waitlist (email, restaurant_name) VALUES (?, ?)').bind(email, restaurantName ?? null).run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      already = true
    } else {
      throw e
    }
  }
  if (!already) {
    // Fire-and-forget: don't block the 201 on email delivery.
    c.executionCtx.waitUntil(sendWaitlistConfirmation(c.env, email, restaurantName ?? null).then((r) => {
      if (!r.ok && !r.skipped) console.error("[email] waitlist confirmation failed", r.error)
    }))
  }
  return c.json({ ok: true, already: already || undefined }, already ? 200 : 201)
})

// Superadmin — waitlist (canonical). Also keep /api/admin/waitlist as alias for backward compat.
app.get('/api/superadmin/waitlist', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT id, email, restaurant_name as restaurantName, created_at as createdAt FROM waitlist ORDER BY created_at DESC LIMIT 500').all()
  return c.json({ entries: results })
})

app.get('/api/admin/waitlist', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT id, email, restaurant_name as restaurantName, created_at as createdAt FROM waitlist ORDER BY created_at DESC LIMIT 500').all()
  return c.json({ entries: results })
})

app.get('/api/superadmin/me', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ user: { id: (session.user as unknown as { id: string }).id, email: (session.user as unknown as { email: string }).email, name: (session.user as unknown as { name: string }).name, role } })
})

// Superadmin — users
app.get('/api/superadmin/users', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare("SELECT id, name, email, role, username, createdAt as createdAt FROM user ORDER BY createdAt DESC LIMIT 500").all()
  // Attach restaurantIds via junction
  const withMembers = await Promise.all((results as Array<Record<string, unknown>>).map(async (u) => {
    const { results: members } = await c.env.DB.prepare('SELECT restaurant_id FROM restaurant_members WHERE user_id = ? UNION SELECT id AS restaurant_id FROM restaurants WHERE owner_id = ?').bind(u.id, u.id).all<{ restaurant_id: string }>()
    return { ...u, restaurantIds: members.map((m) => m.restaurant_id) }
  }))
  return c.json({ users: withMembers })
})

app.post('/api/superadmin/users', zValidator('json', z.object({ name: z.string().min(1).max(80), username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/), email: z.string().email().max(254), password: z.string().min(8).max(128), role: z.enum(['user','superadmin']).default('user'), restaurantIds: z.array(z.string()).optional() })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const input = c.req.valid('json')
  const emailLower = input.email.toLowerCase()
  const usernameLower = input.username.toLowerCase()
  const existingEmail = await c.env.DB.prepare('SELECT id FROM user WHERE lower(email) = ? LIMIT 1').bind(emailLower).first()
  if (existingEmail) return c.json({ error: 'Email already in use' }, 409)
  const existingUsername = await c.env.DB.prepare('SELECT id FROM user WHERE lower(username) = ? LIMIT 1').bind(usernameLower).first()
  if (existingUsername) return c.json({ error: 'Username already in use' }, 409)
  const hashed = await hashPassword(input.password)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await c.env.DB.prepare('INSERT INTO user (id, name, email, emailVerified, role, username, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?, ?, ?)').bind(id, input.name, emailLower, input.role, usernameLower, now, now).run()
  await c.env.DB.prepare('INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, 'credential', id, hashed, now, now).run()
  if (input.restaurantIds?.length) {
    const stmts = input.restaurantIds.map((rid) => c.env.DB.prepare('INSERT OR IGNORE INTO restaurant_members (id, restaurant_id, user_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), rid, id))
    await c.env.DB.batch(stmts)
    // If restaurant has no owner, set first assignment as owner
    const first = input.restaurantIds[0]
    const r = await c.env.DB.prepare('SELECT owner_id FROM restaurants WHERE id = ?').bind(first).first<{ owner_id: string }>()
    if (r && !r.owner_id) await c.env.DB.prepare('UPDATE restaurants SET owner_id = ? WHERE id = ?').bind(id, first).run()
  }
  return c.json({ user: { id, name: input.name, email: emailLower, username: usernameLower, role: input.role, createdAt: now } }, 201)
})

app.patch('/api/superadmin/users/:id', zValidator('json', z.object({ role: z.enum(['user', 'superadmin']).optional(), name: z.string().min(1).max(80).optional(), username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(), email: z.string().email().max(254).optional(), restaurantIds: z.array(z.string()).optional() }).refine((v) => Object.keys(v).length > 0, { message: "No fields to update" })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const targetId = c.req.param('id')
  const input = c.req.valid('json') as { role?: string; name?: string; username?: string; email?: string; restaurantIds?: string[] }
  const selfId = (session.user as unknown as { id: string }).id
  if (targetId === selfId && input.role === 'user') return c.json({ error: "You can't demote yourself" }, 400)
  if (input.restaurantIds !== undefined) {
    const ownedRestaurants = input.restaurantIds.length
      ? await c.env.DB.prepare(`SELECT name FROM restaurants WHERE owner_id = ? AND id NOT IN (${input.restaurantIds.map(() => '?').join(', ')})`).bind(targetId, ...input.restaurantIds).all<{ name: string }>()
      : await c.env.DB.prepare('SELECT name FROM restaurants WHERE owner_id = ?').bind(targetId).all<{ name: string }>()
    if (ownedRestaurants.results.length) return c.json({ error: 'Transfer restaurant ownership before removing the owner access' }, 409)
  }
  if (input.email) {
    const emailLower = input.email.toLowerCase()
    const dup = await c.env.DB.prepare('SELECT id FROM user WHERE lower(email) = ? AND id != ? LIMIT 1').bind(emailLower, targetId).first()
    if (dup) return c.json({ error: 'Email already in use' }, 409)
    await c.env.DB.prepare('UPDATE user SET email = ?, emailVerified = 0, updatedAt = ? WHERE id = ?').bind(emailLower, new Date().toISOString(), targetId).run()
    await c.env.DB.prepare("UPDATE account SET accountId = ? WHERE userId = ? AND providerId = 'credential'").bind(targetId, targetId).run()
  }
  if (input.username) {
    const usernameLower = input.username.toLowerCase()
    const dup = await c.env.DB.prepare('SELECT id FROM user WHERE lower(username) = ? AND id != ? LIMIT 1').bind(usernameLower, targetId).first()
    if (dup) return c.json({ error: 'Username already in use' }, 409)
    await c.env.DB.prepare('UPDATE user SET username = ?, updatedAt = ? WHERE id = ?').bind(usernameLower, new Date().toISOString(), targetId).run()
  }
  if (input.name) await c.env.DB.prepare('UPDATE user SET name = ?, updatedAt = ? WHERE id = ?').bind(input.name, new Date().toISOString(), targetId).run()
  if (input.role) {
    const result = await c.env.DB.prepare("UPDATE user SET role = ?, updatedAt = ? WHERE id = ?").bind(input.role, new Date().toISOString(), targetId).run()
    if (!result.meta.changes) return c.json({ error: 'User not found' }, 404)
    const target = await c.env.DB.prepare("SELECT name, email FROM user WHERE id = ?").bind(targetId).first() as { name: string; email: string } | null
    if (target) {
      const mail = input.role === 'superadmin' ? sendPromotionEmail(c.env, target.email, target.name) : sendDemotionEmail(c.env, target.email, target.name)
      c.executionCtx.waitUntil(mail.then((r) => { if (!r.ok && !r.skipped) console.error("[email] role change failed", r.error) }))
    }
  }
  if (input.restaurantIds !== undefined) {
    await c.env.DB.prepare('DELETE FROM restaurant_members WHERE user_id = ?').bind(targetId).run()
    if (input.restaurantIds.length) {
      const stmts = input.restaurantIds.map((rid) => c.env.DB.prepare('INSERT OR IGNORE INTO restaurant_members (id, restaurant_id, user_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), rid, targetId))
      await c.env.DB.batch(stmts)
    }
  }
  return c.json({ ok: true })
})

app.post('/api/superadmin/users/:id/reset-password', zValidator('json', z.object({ password: z.string().min(8).max(128) })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const targetId = c.req.param('id')
  const { password } = c.req.valid('json')
  const hashed = await hashPassword(password)
  const result = await c.env.DB.prepare("UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = 'credential'").bind(hashed, new Date().toISOString(), targetId).run()
  if (!result.meta.changes) {
    const user = await c.env.DB.prepare('SELECT email FROM user WHERE id = ?').bind(targetId).first<{ email: string }>()
    if (!user) return c.json({ error: 'User not found' }, 404)
    await c.env.DB.prepare('INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), targetId, 'credential', targetId, hashed, new Date().toISOString(), new Date().toISOString()).run()
  }
  return c.json({ ok: true })
})


app.delete('/api/superadmin/users/:id', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const targetId = c.req.param('id')
  const selfId = (session.user as unknown as { id: string }).id
  if (targetId === selfId) return c.json({ error: "You can't delete yourself" }, 400)
  await c.env.DB.prepare("DELETE FROM restaurant_members WHERE user_id = ?").bind(targetId).run()
  await c.env.DB.prepare("DELETE FROM user WHERE id = ?").bind(targetId).run()
  return c.json({ ok: true })
})

// Superadmin — restaurants (all tenants)
app.get('/api/superadmin/restaurants', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT r.id, r.slug, r.name, r.description, r.address, r.hours, r.published, r.currency, r.owner_id as ownerId, u.email as ownerEmail, r.created_at as createdAt FROM restaurants r LEFT JOIN user u ON u.id = r.owner_id ORDER BY r.created_at DESC LIMIT 500').all()
  return c.json({ restaurants: results })
})
app.patch('/api/superadmin/restaurants/:id/owner', zValidator('json', z.object({ ownerId: z.string().min(1), removePreviousOwnerAccess: z.boolean().default(true) })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const restaurantId = c.req.param('id')
  const { ownerId, removePreviousOwnerAccess } = c.req.valid('json')
  const restaurant = await c.env.DB.prepare('SELECT id, owner_id as ownerId FROM restaurants WHERE id = ?').bind(restaurantId).first<{ id: string; ownerId: string }>()
  if (!restaurant) return c.json({ error: 'Restaurant not found' }, 404)
  if (restaurant.ownerId === ownerId) return c.json({ error: 'Choose a different owner' }, 400)
  const user = await c.env.DB.prepare('SELECT id FROM user WHERE id = ?').bind(ownerId).first()
  if (!user) return c.json({ error: 'User not found' }, 404)
  const statements = [
    c.env.DB.prepare('UPDATE restaurants SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(ownerId, restaurantId),
    c.env.DB.prepare("INSERT INTO restaurant_members (id, restaurant_id, user_id, role) VALUES (?, ?, ?, 'owner') ON CONFLICT(restaurant_id, user_id) DO UPDATE SET role = 'owner'").bind(crypto.randomUUID(), restaurantId, ownerId),
  ]
  if (removePreviousOwnerAccess && restaurant.ownerId) {
    statements.push(c.env.DB.prepare('DELETE FROM restaurant_members WHERE restaurant_id = ? AND user_id = ?').bind(restaurantId, restaurant.ownerId))
  }
  await c.env.DB.batch(statements)
  return c.json({ ok: true })
})

// Superadmin — broadcast (promotion / announcement) to waitlist or all users
app.post('/api/superadmin/broadcast', zValidator('json', z.object({ audience: z.enum(['waitlist', 'users', 'all']), subject: z.string().min(1).max(120), html: z.string().min(1).max(10000), text: z.string().min(1).max(10000) })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  return handleBroadcast(c as unknown as Parameters<typeof handleBroadcast>[0], c.req.valid('json'))
})

async function handleBroadcast(c: { env: Env["Bindings"]; executionCtx: { waitUntil: (p: Promise<unknown>) => void } }, input: { audience: 'waitlist' | 'users' | 'all'; subject: string; html: string; text: string; category?: string; tags?: string[] }) {
  const { audience, subject, html, text, category, tags } = input as { audience: string; subject: string; html: string; text: string; category?: string; tags?: string[] }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    await c.env.DB.prepare('INSERT INTO campaigns (id, subject, html, text, audience, tags, category, status, created_at, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, subject, html, text, audience, JSON.stringify(tags ?? []), category ?? null, 'sending', now, now).run()
  } catch { /* table may not exist yet */ }
  const recipients: string[] = []
  if (audience === 'waitlist' || audience === 'all') {
    const { results } = await c.env.DB.prepare('SELECT email FROM waitlist').all<{ email: string }>()
    recipients.push(...results.map(r => r.email))
  }
  if (audience === 'users' || audience === 'all') {
    const { results } = await c.env.DB.prepare('SELECT email FROM user').all<{ email: string }>()
    recipients.push(...results.map(r => r.email))
  }
  const unique = [...new Set(recipients)]
  if (!unique.length) {
    try { await c.env.DB.prepare("UPDATE campaigns SET status = 'sent', sent_count = 0 WHERE id = ?").bind(id).run() } catch {}
    return (c as unknown as { json: (d: unknown) => Response }).json({ ok: true, sent: 0 })
  }
  const { sendBroadcast } = await import('./email')
  const result = await sendBroadcast(c.env as unknown as Parameters<typeof sendBroadcast>[0], unique, subject, html, text)
  if (!result.ok && !result.skipped) {
    try { await c.env.DB.prepare("UPDATE campaigns SET status = 'failed', sent_count = 0 WHERE id = ?").bind(id).run() } catch {}
    return (c as unknown as { json: (d: unknown, s: number) => Response }).json({ error: result.error }, 502)
  }
  if (result.skipped) {
    try { await c.env.DB.prepare("UPDATE campaigns SET status = 'sent', sent_count = 0 WHERE id = ?").bind(id).run() } catch {}
    return (c as unknown as { json: (d: unknown) => Response }).json({ ok: true, sent: 0, skipped: true, reason: result.error })
  }
  try { await c.env.DB.prepare("UPDATE campaigns SET status = 'sent', sent_count = ?, sent_at = ? WHERE id = ?").bind(unique.length, now, id).run() } catch {}
  return (c as unknown as { json: (d: unknown) => Response }).json({ ok: true, sent: unique.length, campaign: { id } })
}

app.get('/api/superadmin/campaigns', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const q = c.req.query('q') ?? ''
  const category = c.req.query('category')
  const tag = c.req.query('tag')
  let sql = 'SELECT id, subject, html, text, audience, tags, category, status, sent_count, created_at, sent_at FROM campaigns WHERE 1=1'
  const binds: unknown[] = []
  if (q) { sql += ' AND (subject LIKE ? OR html LIKE ? OR text LIKE ?)'; const like = `%${q}%`; binds.push(like, like, like) }
  if (category) { sql += ' AND category = ?'; binds.push(category) }
  if (tag) { sql += " AND tags LIKE ?"; binds.push(`%"${tag}"%`) }
  sql += ' ORDER BY created_at DESC LIMIT 200'
  try {
    const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
    return c.json({ campaigns: results })
  } catch {
    return c.json({ campaigns: [] })
  }
})

app.post('/api/superadmin/campaigns', zValidator('json', z.object({ audience: z.enum(['waitlist', 'users', 'all']), subject: z.string().min(1).max(120), html: z.string().min(1).max(10000), text: z.string().min(1).max(10000), category: z.string().max(64).optional(), tags: z.array(z.string().max(32)).optional() })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  return handleBroadcast(c as unknown as Parameters<typeof handleBroadcast>[0], c.req.valid('json'))
})

app.post('/api/superadmin/restaurants', zValidator('json', createRestaurantSchema), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const input = c.req.valid('json')
  const duplicate = await c.env.DB.prepare('SELECT id FROM restaurants WHERE slug = ? LIMIT 1').bind(input.slug).first()
  if (duplicate) return c.json({ error: 'That slug is already in use' }, 409)
  const id = crypto.randomUUID()
  const ownerId = (session.user as unknown as { id: string }).id
  await c.env.DB.prepare('INSERT INTO restaurants (id, owner_id, slug, name, description, address, hours, story, phone, instagram, hours_detail, halal_certification_authority, halal_certification_number, halal_certificate_image_key, promo, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, ownerId, input.slug, input.name, input.description, input.address, input.hours, (input as Record<string, unknown>).story as string ?? '', (input as Record<string, unknown>).phone as string ?? '', (input as Record<string, unknown>).instagram as string ?? '', (input as Record<string, unknown>).hoursDetail as string ?? '', (input as Record<string, unknown>).halalCertificationAuthority ?? '', (input as Record<string, unknown>).halalCertificationNumber ?? '', (input as Record<string, unknown>).halalCertificateImageKey ?? '', (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : '', input.currency ?? 'IDR').run()
  return c.json({ restaurant: { id, ...input, published: 0 } }, 201)
})

app.get('/api/superadmin/restaurants/:id', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  const restaurant = await c.env.DB.prepare('SELECT id, slug, name, description, address, hours, story, phone, instagram, hours_detail as hoursDetail, halal_certification_authority as halalCertificationAuthority, halal_certification_number as halalCertificationNumber, halal_certificate_image_key as halalCertificateImageKey, promo, currency, published, owner_id as ownerId, created_at as createdAt FROM restaurants WHERE id = ?').bind(id).first()
  if (!restaurant) return c.json({ error: 'Restaurant not found' }, 404)
  const promo = (() => { try { const v = (restaurant as Record<string, unknown>).promo ? JSON.parse((restaurant as Record<string, unknown>).promo as string) : null; return v && v.title ? v : null; } catch { return null; } })()
  return c.json({ restaurant: { ...restaurant, promo } })
})

app.patch('/api/superadmin/restaurants/:id', zValidator('json', restaurantSettingsSchema), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const exists = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ?').bind(id).first()
  if (!exists) return c.json({ error: 'Restaurant not found' }, 404)
  const duplicate = await c.env.DB.prepare('SELECT id FROM restaurants WHERE slug = ? AND id != ? LIMIT 1').bind(input.slug, id).first()
  if (duplicate) return c.json({ error: 'That slug is already in use' }, 409)
  await c.env.DB.prepare('UPDATE restaurants SET slug = ?, name = COALESCE(?, name), description = COALESCE(?, description), address = COALESCE(?, address), hours = COALESCE(?, hours), story = COALESCE(?, story), phone = COALESCE(?, phone), instagram = COALESCE(?, instagram), hours_detail = COALESCE(?, hours_detail), halal_certification_authority = ?, halal_certification_number = ?, halal_certificate_image_key = ?, currency = COALESCE(?, currency), promo = COALESCE(?, promo), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(input.slug, input.name ?? null, input.description ?? null, input.address ?? null, input.hours ?? null, (input as Record<string, unknown>).story ?? null, (input as Record<string, unknown>).phone ?? null, (input as Record<string, unknown>).instagram ?? null, (input as Record<string, unknown>).hoursDetail ?? null, (input as Record<string, unknown>).halalCertificationAuthority ?? '', (input as Record<string, unknown>).halalCertificationNumber ?? '', (input as Record<string, unknown>).halalCertificateImageKey ?? '', input.currency ?? null, (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : null, id).run()
  return c.json({ ok: true, ...input })
})

app.delete('/api/superadmin/restaurants/:id', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM menu_items WHERE restaurant_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM restaurants WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

app.get('/api/superadmin/restaurants/:id/items', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  const exists = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ?').bind(id).first()
  if (!exists) return c.json({ error: 'Restaurant not found' }, 404)
  const { results } = await c.env.DB.prepare("SELECT id, name, description, price, category, image_key as imageKey, tag, CASE WHEN archived = 1 THEN 'ARCHIVED' ELSE status END AS status, sort_order as sortOrder, archived, ingredients, dietary_tags as dietaryTags, halal_status as halalStatus, spice_level as spiceLevel, is_special as isSpecial FROM menu_items WHERE restaurant_id = ? ORDER BY CASE WHEN archived = 1 THEN 2 WHEN status = 'DRAFT' THEN 0 ELSE 1 END, sort_order ASC, created_at DESC").bind(id).all()
  return c.json({ items: results.map(item => normalizeMenuItem(item as Record<string, unknown>)) })
})

app.post('/api/superadmin/restaurants/:id/items', zValidator('json', menuItemSchema), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const restaurantId = c.req.param('id')
  const exists = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ?').bind(restaurantId).first()
  if (!exists) return c.json({ error: 'Restaurant not found' }, 404)
  const input = c.req.valid('json')
  await c.env.DB.prepare("INSERT INTO menu_items (restaurant_id, name, description, price, category, image_key, tag, ingredients, dietary_tags, halal_status, spice_level, status, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)").bind(restaurantId, input.name, input.description, input.price, input.category, input.imageKey ?? null, input.tag ?? null, input.ingredients ?? '', JSON.stringify(input.dietaryTags ?? []), input.halalStatus ?? 'UNKNOWN', input.spiceLevel ?? null, (input as Record<string, unknown>).isSpecial ? 1 : 0).run()
  return c.json({ ok: true }, 201)
})

app.patch('/api/superadmin/restaurants/:id/items/:itemId', zValidator('json', menuItemSchema.partial()), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const restaurantId = c.req.param('id')
  const itemId = c.req.param('itemId')
  const input = c.req.valid('json')
  const current = await c.env.DB.prepare('SELECT id, archived FROM menu_items WHERE id = ? AND restaurant_id = ?').bind(itemId, restaurantId).first<{ id: string; archived: number }>()
  if (!current) return c.json({ error: 'Item not found' }, 404)
  if (input.status === 'PUBLISHED' && current.archived) return c.json({ error: 'Restore the item before publishing it' }, 409)
  const fields = Object.entries(input)
  if (!fields.length) return c.json({ ok: true })
  const columnMap: Record<string, string> = { imageKey: 'image_key', dietaryTags: 'dietary_tags', halalStatus: 'halal_status', spiceLevel: 'spice_level', sortOrder: 'sort_order', isSpecial: 'is_special' }
  const jsonFields: Record<string, true> = { dietaryTags: true }
  const boolFields: Record<string, true> = { isSpecial: true }
  const set = fields.map(([key]) => `${columnMap[key] ?? key} = ?`).join(', ')
  const archiveClause = input.status === 'DRAFT' ? ', archived = 0' : input.status === 'ARCHIVED' ? ', archived = 1' : ''
  await c.env.DB.prepare(`UPDATE menu_items SET ${set}${archiveClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`).bind(...fields.map(([key, value]) => jsonFields[key] ? JSON.stringify(value ?? []) : boolFields[key] ? (value ? 1 : 0) : value ?? null), itemId, restaurantId).run()
  return c.json({ ok: true })
})

app.delete('/api/superadmin/restaurants/:id/items/:itemId', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const restaurantId = c.req.param('id')
  const itemId = c.req.param('itemId')
  const result = await c.env.DB.prepare("UPDATE menu_items SET archived = 1, status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?").bind(itemId, restaurantId).run()
  if (!result.meta.changes) return c.json({ error: 'Item not found' }, 404)
  return c.json({ ok: true })
})

app.post('/api/superadmin/restaurants/:id/publish', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE restaurants SET published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

app.post('/api/superadmin/restaurants/:id/unpublish', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE restaurants SET published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

app.post('/api/superadmin/restaurants/:id/visibility', zValidator('json', z.object({ published: z.boolean() })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  const { published } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE restaurants SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(published ? 1 : 0, id).run()
  return c.json({ ok: true, published: published ? 1 : 0 })
})

app.get('/api/superadmin/images/*', async c => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const key = decodeURIComponent(c.req.path.replace('/api/superadmin/images/', ''))
  if (!key || !key.startsWith('menu/')) return c.json({ error: 'Invalid image key' }, 400)
  const object = await c.env.MENU_IMAGES.get(key)
  if (!object) return c.notFound()
  return imageResponse(object)
})

app.post('/api/superadmin/restaurants/:id/images', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const restaurantId = c.req.param('id')
  const exists = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ?').bind(restaurantId).first()
  if (!exists) return c.json({ error: 'Restaurant not found' }, 404)
  const allowed = await checkRateLimit(c.env, `upload:${restaurantId}`, 60, 60 * 60 * 1000)
  if (!allowed) return c.json({ error: 'Upload limit reached. Try again later.' }, 429)
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) return c.json({ error: 'Image file is required' }, 400)
  if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Image must be smaller than 10MB' }, 413)
  const detectedType = sniffImageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()))
  if (!detectedType) return c.json({ error: 'Only JPG, PNG, or WebP images are supported' }, 415)
  const key = `menu/${restaurantId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  await c.env.MENU_IMAGES.put(key, file.stream(), { httpMetadata: { contentType: detectedType } })
  return c.json({ key }, 201)
})


app.get('/sitemap.xml', async c => {
  const { results } = await c.env.DB.prepare('SELECT slug, updated_at FROM restaurants WHERE published = 1').all<{ slug: string; updated_at: string }>()
  const base = c.env.PUBLIC_APP_URL.replace(/\/$/, '')
  const urls = results.map(r => `  <url><loc>${base}/${r.slug}</loc><lastmod>${r.updated_at}</lastmod></url>`).join('\n')
  return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc></url>\n${urls}\n</urlset>`, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

app.get('/api/menu/:slug', async c => {
  const slug = c.req.param('slug')
  const restaurant = await c.env.DB.prepare('SELECT id, slug, name, description, address, hours, story, phone, instagram, hours_detail as hoursDetail, halal_certification_authority as halalCertificationAuthority, halal_certification_number as halalCertificationNumber, halal_certificate_image_key as halalCertificateImageKey, promo, published, currency, banner_type as bannerType, banner_promo_id as bannerPromoId, banner_announcement as bannerAnnouncement, banner_dismissible as bannerDismissible FROM restaurants WHERE slug = ?').bind(slug).first<{ id: string; slug: string; name: string; description: string; address: string; hours: string; story: string; phone: string; instagram: string; hoursDetail: string; halalCertificationAuthority: string; halalCertificationNumber: string; halalCertificateImageKey: string; promo: string; published: number; currency: string; bannerType: string; bannerPromoId: string | null; bannerAnnouncement: string | null; bannerDismissible: number | null }>()
  if (!restaurant) return c.json({ error: 'Menu not found' }, 404)
  const { id: _id, published, currency, bannerType, bannerPromoId, bannerAnnouncement, bannerDismissible, ...publicRestaurant } = restaurant as unknown as Record<string, unknown> & { published: number; currency: string; bannerType: string; bannerPromoId: string | null; bannerAnnouncement: string | null; bannerDismissible: number | null }
  const promo = (() => { try { const v = (restaurant as unknown as Record<string, unknown>).promo ? JSON.parse((restaurant as unknown as Record<string, unknown>).promo as string) : null; return v && v.title ? v : null; } catch { return null; } })()
  const banner = await (async () => {
    const type = (bannerType as string) ?? 'none'
    if (type === 'promo' && bannerPromoId) {
      try {
        const p = await c.env.DB.prepare('SELECT title, description, badge, type, valid_until as validUntil FROM promos WHERE id = ? AND status = ?').bind(bannerPromoId, 'active').first()
        if (p) return { type, promo: p, dismissible: Boolean(bannerDismissible ?? 1) }
      } catch {}
    }
    if (type === 'announcement' && bannerAnnouncement) return { type, announcement: bannerAnnouncement, dismissible: Boolean(bannerDismissible ?? 1) }
    if (type !== 'none' && promo) return { type: 'promo' as const, promo, dismissible: Boolean(bannerDismissible ?? 1) }
    return type !== 'none' ? { type, announcement: bannerAnnouncement ?? undefined, dismissible: Boolean(bannerDismissible ?? 1) } : null
  })()
  if (published === 0) return c.json({ restaurant: { ...publicRestaurant, promo, currency: (currency as string) || 'IDR', banner, menuVisible: false }, items: [] })
  const { results } = await c.env.DB.prepare("SELECT id, name, description, price, category, image_key as imageKey, tag, status, ingredients, dietary_tags as dietaryTags, halal_status as halalStatus, spice_level as spiceLevel, is_special as isSpecial FROM menu_items WHERE restaurant_id = ? AND status = 'PUBLISHED' AND archived = 0 ORDER BY sort_order ASC").bind((restaurant as unknown as { id: string }).id).all()
  // Compute effectivePrice from active promos
  let activePromos: Array<Record<string, unknown>> = []
  try {
    const { results: promos } = await c.env.DB.prepare("SELECT id, title, type, applies_to as appliesTo, applies_ids as appliesIds, min_purchase as minPurchase FROM promos WHERE restaurant_id = ? AND status = 'active' AND (valid_until IS NULL OR valid_until > datetime('now'))").bind((restaurant as unknown as { id: string }).id).all()
    activePromos = promos as unknown as Array<Record<string, unknown>>
  } catch {}
  const itemsWithPrice = (results as Array<Record<string, unknown>>).map((item) => {
    const price = Number(item.price)
    let effectivePrice = price
    for (const p of activePromos) {
      const appliesTo = p.appliesTo as string
      const appliesIds = (() => { try { return JSON.parse(p.appliesIds as string) as string[] } catch { return [] } })()
      const applies = appliesTo === 'all' || (appliesTo === 'categories' && appliesIds.includes(item.category as string)) || (appliesTo === 'items' && appliesIds.includes(item.id as string))
      if (!applies) continue
      const t = p.type as string
      if (t === 'percentage') {
        // percentage value stored in description or badge? For now treat as 10% if type percentage
        // Real value would be in promo_rules; fallback to 10%
        effectivePrice = Math.min(effectivePrice, price * 0.9)
      } else if (t === 'fixed') {
        effectivePrice = Math.min(effectivePrice, Math.max(0, price - 10000))
      }
    }
    return { ...normalizeMenuItem(item), effectivePrice: effectivePrice !== price ? String(effectivePrice) : undefined }
  })
  return c.json({ restaurant: { ...publicRestaurant, promo, currency: (currency as string) || 'IDR', banner, menuVisible: true }, items: itemsWithPrice, promos: activePromos })
})


app.get('/api/images/*', async c => {
  const key = decodeURIComponent(c.req.path.replace('/api/images/', ''))
  if (!key || !key.startsWith('menu/')) return c.json({ error: 'Invalid image key' }, 400)
  // Serve only images referenced by a published item from a published restaurant.
  const match = await c.env.DB.prepare("SELECT 1 FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id WHERE ((mi.image_key = ? AND mi.status = 'PUBLISHED' AND mi.archived = 0) OR r.halal_certificate_image_key = ?) AND r.published = 1 LIMIT 1").bind(key, key).first()
  if (!match) return c.notFound()
  const object = await c.env.MENU_IMAGES.get(key)
  if (!object) return c.notFound()
  return imageResponse(object)
})

app.get('/api/admin/items', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const { results } = await c.env.DB.prepare("SELECT id, name, description, price, category, image_key as imageKey, tag, CASE WHEN archived = 1 THEN 'ARCHIVED' ELSE status END AS status, sort_order as sortOrder, archived, ingredients, dietary_tags as dietaryTags, halal_status as halalStatus, spice_level as spiceLevel, is_special as isSpecial FROM menu_items WHERE restaurant_id = ? ORDER BY CASE WHEN archived = 1 THEN 2 WHEN status = 'DRAFT' THEN 0 ELSE 1 END, sort_order ASC, created_at DESC").bind(restaurant.id).all()
  return c.json({ items: results.map(item => normalizeMenuItem(item as Record<string, unknown>)) })
})
app.get('/api/admin/restaurants', async c => {
  const auth = createAuth(c.env.DB, requestOrigin(c), c.env.BETTER_AUTH_SECRET)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  const { results } = await c.env.DB.prepare('SELECT id, slug, name, description, address, hours, story, phone, instagram, hours_detail as hoursDetail, halal_certification_authority as halalCertificationAuthority, halal_certification_number as halalCertificationNumber, halal_certificate_image_key as halalCertificateImageKey, promo, published, currency, banner_type as bannerType, banner_promo_id as bannerPromoId, banner_announcement as bannerAnnouncement, banner_dismissible as bannerDismissible FROM restaurants WHERE owner_id = ? OR id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = ?) ORDER BY created_at ASC').bind(session.user.id, session.user.id).all()
  return c.json({ restaurants: results })
})

app.post('/api/admin/restaurants', zValidator('json', createRestaurantSchema), async c => {
  const auth = createAuth(c.env.DB, requestOrigin(c), c.env.BETTER_AUTH_SECRET)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  const input = c.req.valid('json')
  const duplicate = await c.env.DB.prepare('SELECT id FROM restaurants WHERE slug = ? LIMIT 1').bind(input.slug).first()
  if (duplicate) return c.json({ error: 'That slug is already in use' }, 409)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO restaurants (id, owner_id, slug, name, description, address, hours, story, phone, instagram, hours_detail, halal_certification_authority, halal_certification_number, halal_certificate_image_key, promo, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, session.user.id, input.slug, input.name, input.description, input.address, input.hours, (input as Record<string, unknown>).story as string ?? '', (input as Record<string, unknown>).phone as string ?? '', (input as Record<string, unknown>).instagram as string ?? '', (input as Record<string, unknown>).hoursDetail as string ?? '', (input as Record<string, unknown>).halalCertificationAuthority ?? '', (input as Record<string, unknown>).halalCertificationNumber ?? '', (input as Record<string, unknown>).halalCertificateImageKey ?? '', (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : '', input.currency ?? 'IDR').run()
  return c.json({ restaurant: { id, ...input, published: 0 } }, 201)
})


app.patch('/api/admin/restaurant', zValidator('json', restaurantSettingsSchema), async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const input = c.req.valid('json')
  const duplicate = await c.env.DB.prepare('SELECT id FROM restaurants WHERE slug = ? AND id != ? LIMIT 1').bind(input.slug, restaurant.id).first()
  if (duplicate) return c.json({ error: 'That slug is already in use' }, 409)
  const bannerType = (input as Record<string, unknown>).bannerType as string | undefined
  const bannerPromoId = (input as Record<string, unknown>).bannerPromoId as string | null | undefined
  const bannerAnnouncement = (input as Record<string, unknown>).bannerAnnouncement as string | null | undefined
  const bannerDismissible = (input as Record<string, unknown>).bannerDismissible as boolean | undefined
  const currency = (input as Record<string, unknown>).currency as string | undefined
  await c.env.DB.prepare('UPDATE restaurants SET slug = ?, name = COALESCE(?, name), description = COALESCE(?, description), address = COALESCE(?, address), hours = COALESCE(?, hours), story = COALESCE(?, story), phone = COALESCE(?, phone), instagram = COALESCE(?, instagram), hours_detail = COALESCE(?, hours_detail), halal_certification_authority = ?, halal_certification_number = ?, halal_certificate_image_key = ?, promo = COALESCE(?, promo), currency = COALESCE(?, currency), banner_type = COALESCE(?, banner_type), banner_promo_id = COALESCE(?, banner_promo_id), banner_announcement = COALESCE(?, banner_announcement), banner_dismissible = COALESCE(?, banner_dismissible), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(input.slug, input.name ?? null, input.description ?? null, input.address ?? null, input.hours ?? null, (input as Record<string, unknown>).story ?? null, (input as Record<string, unknown>).phone ?? null, (input as Record<string, unknown>).instagram ?? null, (input as Record<string, unknown>).hoursDetail ?? null, (input as Record<string, unknown>).halalCertificationAuthority ?? '', (input as Record<string, unknown>).halalCertificationNumber ?? '', (input as Record<string, unknown>).halalCertificateImageKey ?? '', (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : null, currency ?? null, bannerType ?? null, bannerPromoId !== undefined ? bannerPromoId : null, bannerAnnouncement !== undefined ? bannerAnnouncement : null, bannerDismissible !== undefined ? (bannerDismissible ? 1 : 0) : null, restaurant.id).run()
  return c.json({ ok: true, ...input })
})


app.post('/api/admin/items', zValidator('json', menuItemSchema), async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Restaurant not found' }, 404)
  const input = c.req.valid('json')
  await c.env.DB.prepare("INSERT INTO menu_items (restaurant_id, name, description, price, category, image_key, tag, ingredients, dietary_tags, halal_status, spice_level, status, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)").bind(restaurant.id, input.name, input.description, input.price, input.category, input.imageKey ?? null, input.tag ?? null, input.ingredients ?? '', JSON.stringify(input.dietaryTags ?? []), input.halalStatus ?? 'UNKNOWN', input.spiceLevel ?? null, (input as Record<string, unknown>).isSpecial ? 1 : 0).run()
  return c.json({ ok: true }, 201)
})

app.patch('/api/admin/items/:id', zValidator('json', menuItemSchema.partial()), async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const input = c.req.valid('json')
  const current = await c.env.DB.prepare('SELECT id, archived FROM menu_items WHERE id = ? AND restaurant_id = ?').bind(c.req.param('id'), restaurant.id).first<{ id: string; archived: number }>()
  if (!current) return c.json({ error: 'Item not found' }, 404)
  if (input.status === 'PUBLISHED' && current.archived) return c.json({ error: 'Restore the item before publishing it' }, 409)
  const fields = Object.entries(input)
  if (!fields.length) return c.json({ ok: true })
  const columnMap: Record<string, string> = { imageKey: 'image_key', dietaryTags: 'dietary_tags', halalStatus: 'halal_status', spiceLevel: 'spice_level', sortOrder: 'sort_order', isSpecial: 'is_special' }
  const jsonFields: Record<string, true> = { dietaryTags: true }
  const boolFields: Record<string, true> = { isSpecial: true }
  const set = fields.map(([key]) => `${columnMap[key] ?? key} = ?`).join(', ')
  const archiveClause = input.status === 'DRAFT' ? ', archived = 0' : input.status === 'ARCHIVED' ? ', archived = 1' : ''
  await c.env.DB.prepare(`UPDATE menu_items SET ${set}${archiveClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`).bind(...fields.map(([key, value]) => jsonFields[key] ? JSON.stringify(value ?? []) : boolFields[key] ? (value ? 1 : 0) : value ?? null), c.req.param('id'), restaurant.id).run()
  return c.json({ ok: true })
})

app.delete('/api/admin/items/:id', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const result = await c.env.DB.prepare("UPDATE menu_items SET archived = 1, status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?").bind(c.req.param('id'), restaurant.id).run()
  if (!result.meta.changes) return c.json({ error: 'Item not found' }, 404)
  return c.json({ ok: true })
})

app.post('/api/admin/publish', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  await c.env.DB.prepare('UPDATE restaurants SET published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(restaurant.id).run()
  return c.json({ ok: true })
})

app.post('/api/admin/unpublish', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  await c.env.DB.prepare('UPDATE restaurants SET published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(restaurant.id).run()
  return c.json({ ok: true })
})

// Visibility toggle — flips restaurants.published without touching item statuses.
app.post('/api/admin/visibility', zValidator('json', z.object({ published: z.boolean() })), async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const { published } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE restaurants SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(published ? 1 : 0, restaurant.id).run()
  return c.json({ ok: true, published: published ? 1 : 0 })
})

// Promos — admin CRUD
app.get('/api/admin/promos', async (c) => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { results } = await c.env.DB.prepare('SELECT id, title, description, badge, type, status, valid_from, valid_until, usage_limit, usage_count, min_purchase, applies_to, applies_ids, stackable, created_at FROM promos WHERE restaurant_id = ? ORDER BY created_at DESC').bind(restaurant.id).all()
    return c.json({ promos: results })
  } catch { return c.json({ promos: [] }) }
})
app.post('/api/admin/promos', zValidator('json', z.object({ title: z.string().min(1).max(80), description: z.string().max(240).optional(), badge: z.string().max(32).optional(), type: z.enum(['percentage','fixed','bogo','bundle','free_shipping','custom']), status: z.enum(['draft','active','scheduled','expired','archived']).optional(), valid_from: z.string().optional(), valid_until: z.string().optional(), usage_limit: z.number().int().optional(), min_purchase: z.number().optional(), applies_to: z.enum(['all','categories','items']).optional(), applies_ids: z.array(z.string()).optional(), stackable: z.number().optional() })), async (c) => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const input = c.req.valid('json') as Record<string, unknown>
  const validFrom = input.valid_from as string | undefined
  const validUntil = input.valid_until as string | undefined
  if (validFrom && validUntil && validFrom > validUntil) return c.json({ error: 'valid_from must be before valid_until' }, 400)
  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare('INSERT INTO promos (id, restaurant_id, title, description, badge, type, status, valid_from, valid_until, usage_limit, min_purchase, applies_to, applies_ids, stackable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, restaurant.id, input.title, (input.description as string) ?? null, (input.badge as string) ?? null, input.type, (input.status as string) ?? 'draft', validFrom ?? null, validUntil ?? null, (input.usage_limit as number) ?? null, (input.min_purchase as number) ?? null, (input.applies_to as string) ?? 'all', JSON.stringify((input.applies_ids as string[]) ?? []), (input.stackable as number) ?? 0).run()
  } catch (e: unknown) { return c.json({ error: e instanceof Error ? e.message : 'Failed to create promo' }, 400) }
  return c.json({ promo: { id } }, 201)
})
app.patch('/api/admin/promos/:id', zValidator('json', z.object({ title: z.string().min(1).max(80).optional(), description: z.string().max(240).optional().nullable(), badge: z.string().max(32).optional().nullable(), type: z.enum(['percentage','fixed','bogo','bundle','free_shipping','custom']).optional(), status: z.enum(['draft','active','scheduled','expired','archived']).optional(), valid_from: z.string().nullable().optional(), valid_until: z.string().nullable().optional(), usage_limit: z.number().int().nullable().optional(), min_purchase: z.number().nullable().optional(), applies_to: z.enum(['all','categories','items']).optional(), applies_ids: z.array(z.string()).optional(), stackable: z.number().optional() })), async (c) => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const input = c.req.valid('json') as Record<string, unknown>
  const fields: string[] = []
  const values: unknown[] = []
  const colMap: Record<string, string> = { valid_from: 'valid_from', valid_until: 'valid_until', usage_limit: 'usage_limit', min_purchase: 'min_purchase', applies_to: 'applies_to', applies_ids: 'applies_ids' }
  for (const [k, v] of Object.entries(input)) {
    if (k === 'applies_ids') { fields.push('applies_ids = ?'); values.push(JSON.stringify(v)) }
    else if (colMap[k]) { fields.push(`${colMap[k]} = ?`); values.push(v) }
    else { fields.push(`${k} = ?`); values.push(v) }
  }
  if (!fields.length) return c.json({ ok: true })
  fields.push("updated_at = CURRENT_TIMESTAMP")
  await c.env.DB.prepare(`UPDATE promos SET ${fields.join(', ')} WHERE id = ? AND restaurant_id = ?`).bind(...values, id, restaurant.id).run()
  return c.json({ ok: true })
})
app.delete('/api/admin/promos/:id', async (c) => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM promos WHERE id = ? AND restaurant_id = ?').bind(id, restaurant.id).run()
  return c.json({ ok: true })
})

app.get('/api/admin/images/*', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const key = decodeURIComponent(c.req.path.replace('/api/admin/images/', ''))
  if (!key || !key.startsWith(`menu/${restaurant.id}/`)) return c.json({ error: 'Invalid image key' }, 400)
  const object = await c.env.MENU_IMAGES.get(key)
  if (!object) return c.notFound()
  return imageResponse(object)
})
app.post('/api/admin/images', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const allowed = await checkRateLimit(c.env, `upload:${restaurant.id}`, 60, 60 * 60 * 1000)
  if (!allowed) return c.json({ error: 'Upload limit reached. Try again later.' }, 429)
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) return c.json({ error: 'Image file is required' }, 400)
  if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Image must be smaller than 10MB' }, 413)
  const detectedType = sniffImageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()))
  if (!detectedType) return c.json({ error: 'Only JPG, PNG, or WebP images are supported' }, 415)
  const key = `menu/${restaurant.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  await c.env.MENU_IMAGES.put(key, file.stream(), { httpMetadata: { contentType: detectedType } })
  return c.json({ key }, 201)
})
app.get('/api/health', c => c.json({ ok: true }))
app.all('*', async c => c.env.ASSETS ? await c.env.ASSETS.fetch(c.req.raw) : c.json({ error: 'Not found' }, 404))
export default app
