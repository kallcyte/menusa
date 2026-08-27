/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
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
    ingredients: typeof row.ingredients === 'string' ? row.ingredients : '',
    allergens: parseJsonArray(row.allergens),
    mayContain: parseJsonArray(row.mayContain),
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
  return (requestedId
    ? c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ? AND owner_id = ? LIMIT 1').bind(requestedId, userId)
    : c.env.DB.prepare('SELECT id FROM restaurants WHERE owner_id = ? ORDER BY created_at ASC LIMIT 1').bind(userId)).first() as Promise<{ id: string } | null>
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
  const { results } = await c.env.DB.prepare("SELECT id, name, email, role, createdAt as createdAt FROM user ORDER BY createdAt DESC LIMIT 500").all()
  return c.json({ users: results })
})

app.patch('/api/superadmin/users/:id', zValidator('json', z.object({ role: z.enum(['user', 'superadmin']) })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const targetId = c.req.param('id')
  const { role: nextRole } = c.req.valid('json')
  const selfId = (session.user as unknown as { id: string }).id
  if (targetId === selfId && nextRole !== 'superadmin') return c.json({ error: "You can't demote yourself" }, 400)
  const result = await c.env.DB.prepare("UPDATE user SET role = ? WHERE id = ?").bind(nextRole, targetId).run()
  if (!result.meta.changes) return c.json({ error: 'User not found' }, 404)
  const target = await c.env.DB.prepare("SELECT name, email FROM user WHERE id = ?").bind(targetId).first() as { name: string; email: string } | null
  if (target) {
    const mail = nextRole === 'superadmin' ? sendPromotionEmail(c.env, target.email, target.name) : sendDemotionEmail(c.env, target.email, target.name)
    c.executionCtx.waitUntil(mail.then((r) => { if (!r.ok && !r.skipped) console.error("[email] role change failed", r.error) }))
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
  await c.env.DB.prepare("DELETE FROM user WHERE id = ?").bind(targetId).run()
  return c.json({ ok: true })
})

// Superadmin — restaurants (all tenants)
app.get('/api/superadmin/restaurants', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT r.id, r.slug, r.name, r.description, r.address, r.hours, r.published, r.owner_id as ownerId, u.email as ownerEmail, r.created_at as createdAt FROM restaurants r LEFT JOIN user u ON u.id = r.owner_id ORDER BY r.created_at DESC LIMIT 500').all()
  return c.json({ restaurants: results })
})

// Superadmin — broadcast (promotion / announcement) to waitlist or all users
app.post('/api/superadmin/broadcast', zValidator('json', z.object({ audience: z.enum(['waitlist', 'users', 'all']), subject: z.string().min(1).max(120), html: z.string().min(1).max(10000), text: z.string().min(1).max(10000) })), async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const { audience, subject, html, text } = c.req.valid('json')
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
  if (!unique.length) return c.json({ ok: true, sent: 0 })
  const { sendBroadcast } = await import('./email')
  const result = await sendBroadcast(c.env, unique, subject, html, text)
  if (!result.ok && !result.skipped) return c.json({ error: result.error }, 502)
  if (result.skipped) return c.json({ ok: true, sent: 0, skipped: true, reason: result.error })
  return c.json({ ok: true, sent: unique.length })
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
  await c.env.DB.prepare('INSERT INTO restaurants (id, owner_id, slug, name, description, address, hours, story, phone, instagram, hours_detail, promo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, ownerId, input.slug, input.name, input.description, input.address, input.hours, (input as Record<string, unknown>).story as string ?? '', (input as Record<string, unknown>).phone as string ?? '', (input as Record<string, unknown>).instagram as string ?? '', (input as Record<string, unknown>).hoursDetail as string ?? '', (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : '').run()
  return c.json({ restaurant: { id, ...input, published: 0 } }, 201)
})

app.get('/api/superadmin/restaurants/:id', async (c) => {
  const { session, role } = await getSessionAndRole(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (role !== 'superadmin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  const restaurant = await c.env.DB.prepare('SELECT id, slug, name, description, address, hours, story, phone, instagram, hours_detail as hoursDetail, promo, published, owner_id as ownerId, created_at as createdAt FROM restaurants WHERE id = ?').bind(id).first()
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
  await c.env.DB.prepare('UPDATE restaurants SET slug = ?, name = COALESCE(?, name), description = COALESCE(?, description), address = COALESCE(?, address), hours = COALESCE(?, hours), story = COALESCE(?, story), phone = COALESCE(?, phone), instagram = COALESCE(?, instagram), hours_detail = COALESCE(?, hours_detail), promo = COALESCE(?, promo), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(input.slug, input.name ?? null, input.description ?? null, input.address ?? null, input.hours ?? null, (input as Record<string, unknown>).story ?? null, (input as Record<string, unknown>).phone ?? null, (input as Record<string, unknown>).instagram ?? null, (input as Record<string, unknown>).hoursDetail ?? null, (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : null, id).run()
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
  const { results } = await c.env.DB.prepare("SELECT id, name, description, price, category, image_key as imageKey, tag, CASE WHEN archived = 1 THEN 'ARCHIVED' ELSE status END AS status, sort_order as sortOrder, archived, ingredients, allergens, may_contain as mayContain, dietary_tags as dietaryTags, halal_status as halalStatus, spice_level as spiceLevel, is_special as isSpecial FROM menu_items WHERE restaurant_id = ? ORDER BY CASE WHEN archived = 1 THEN 2 WHEN status = 'DRAFT' THEN 0 ELSE 1 END, sort_order ASC, created_at DESC").bind(id).all()
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
  await c.env.DB.prepare("INSERT INTO menu_items (restaurant_id, name, description, price, category, image_key, tag, ingredients, allergens, may_contain, dietary_tags, halal_status, spice_level, status, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)").bind(restaurantId, input.name, input.description, input.price, input.category, input.imageKey ?? null, input.tag ?? null, input.ingredients ?? '', JSON.stringify(input.allergens ?? []), JSON.stringify(input.mayContain ?? []), JSON.stringify(input.dietaryTags ?? []), input.halalStatus ?? 'UNKNOWN', input.spiceLevel ?? null, (input as Record<string, unknown>).isSpecial ? 1 : 0).run()
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
  const columnMap: Record<string, string> = { imageKey: 'image_key', mayContain: 'may_contain', dietaryTags: 'dietary_tags', halalStatus: 'halal_status', spiceLevel: 'spice_level', sortOrder: 'sort_order', isSpecial: 'is_special' }
  const jsonFields: Record<string, true> = { allergens: true, mayContain: true, dietaryTags: true }
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
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE menu_items SET status = \'PUBLISHED\', archived = 0, updated_at = CURRENT_TIMESTAMP WHERE restaurant_id = ? AND status = \'DRAFT\' AND archived = 0').bind(id),
    c.env.DB.prepare('UPDATE restaurants SET published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id),
  ])
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
  const restaurant = await c.env.DB.prepare('SELECT id, slug, name, description, address, hours, story, phone, instagram, hours_detail as hoursDetail, promo FROM restaurants WHERE slug = ? AND published = 1').bind(slug).first<{ id: string; slug: string; name: string; description: string; address: string; hours: string; story: string; phone: string; instagram: string; hoursDetail: string; promo: string }>()
  if (!restaurant) return c.json({ error: 'Menu not found' }, 404)
  const { results } = await c.env.DB.prepare("SELECT id, name, description, price, category, image_key as imageKey, tag, status, ingredients, allergens, may_contain as mayContain, dietary_tags as dietaryTags, halal_status as halalStatus, spice_level as spiceLevel, is_special as isSpecial FROM menu_items WHERE restaurant_id = ? AND status = 'PUBLISHED' AND archived = 0 ORDER BY sort_order ASC").bind(restaurant.id).all()
  const { id: _id, ...publicRestaurant } = restaurant
  const promo = (() => { try { const v = (restaurant as Record<string, unknown>).promo ? JSON.parse((restaurant as Record<string, unknown>).promo as string) : null; return v && v.title ? v : null; } catch { return null; } })()
  return c.json({ restaurant: { ...publicRestaurant, promo }, items: results.map(item => normalizeMenuItem(item as Record<string, unknown>)) })
})

app.get('/api/images/*', async c => {
  const key = decodeURIComponent(c.req.path.replace('/api/images/', ''))
  if (!key || !key.startsWith('menu/')) return c.json({ error: 'Invalid image key' }, 400)
  // Serve only images referenced by a published item from a published restaurant.
  const match = await c.env.DB.prepare("SELECT 1 FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id WHERE mi.image_key = ? AND mi.status = 'PUBLISHED' AND mi.archived = 0 AND r.published = 1 LIMIT 1").bind(key).first()
  if (!match) return c.notFound()
  const object = await c.env.MENU_IMAGES.get(key)
  if (!object) return c.notFound()
  return imageResponse(object)
})

app.get('/api/admin/items', async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const { results } = await c.env.DB.prepare("SELECT id, name, description, price, category, image_key as imageKey, tag, CASE WHEN archived = 1 THEN 'ARCHIVED' ELSE status END AS status, sort_order as sortOrder, archived, ingredients, allergens, may_contain as mayContain, dietary_tags as dietaryTags, halal_status as halalStatus, spice_level as spiceLevel, is_special as isSpecial FROM menu_items WHERE restaurant_id = ? ORDER BY CASE WHEN archived = 1 THEN 2 WHEN status = 'DRAFT' THEN 0 ELSE 1 END, sort_order ASC, created_at DESC").bind(restaurant.id).all()
  return c.json({ items: results.map(item => normalizeMenuItem(item as Record<string, unknown>)) })
})

app.get('/api/admin/restaurants', async c => {
  const auth = createAuth(c.env.DB, requestOrigin(c), c.env.BETTER_AUTH_SECRET)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  const { results } = await c.env.DB.prepare('SELECT id, slug, name, description, address, hours, story, phone, instagram, hours_detail as hoursDetail, promo, published FROM restaurants WHERE owner_id = ? ORDER BY created_at ASC').bind(session.user.id).all()
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
  await c.env.DB.prepare('INSERT INTO restaurants (id, owner_id, slug, name, description, address, hours, story, phone, instagram, hours_detail, promo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, session.user.id, input.slug, input.name, input.description, input.address, input.hours, (input as Record<string, unknown>).story as string ?? '', (input as Record<string, unknown>).phone as string ?? '', (input as Record<string, unknown>).instagram as string ?? '', (input as Record<string, unknown>).hoursDetail as string ?? '', (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : '').run()
  return c.json({ restaurant: { id, ...input, published: 0 } }, 201)
})

app.patch('/api/admin/restaurant', zValidator('json', restaurantSettingsSchema), async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Unauthorized' }, 401)
  const input = c.req.valid('json')
  const duplicate = await c.env.DB.prepare('SELECT id FROM restaurants WHERE slug = ? AND id != ? LIMIT 1').bind(input.slug, restaurant.id).first()
  if (duplicate) return c.json({ error: 'That slug is already in use' }, 409)
  await c.env.DB.prepare('UPDATE restaurants SET slug = ?, name = COALESCE(?, name), description = COALESCE(?, description), address = COALESCE(?, address), hours = COALESCE(?, hours), story = COALESCE(?, story), phone = COALESCE(?, phone), instagram = COALESCE(?, instagram), hours_detail = COALESCE(?, hours_detail), promo = COALESCE(?, promo), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(input.slug, input.name ?? null, input.description ?? null, input.address ?? null, input.hours ?? null, (input as Record<string, unknown>).story ?? null, (input as Record<string, unknown>).phone ?? null, (input as Record<string, unknown>).instagram ?? null, (input as Record<string, unknown>).hoursDetail ?? null, (input as Record<string, unknown>).promo !== undefined ? JSON.stringify((input as Record<string, unknown>).promo) : null, restaurant.id).run()
  return c.json({ ok: true, ...input })
})

app.post('/api/admin/items', zValidator('json', menuItemSchema), async c => {
  const restaurant = await getOwnedRestaurant(c)
  if (!restaurant) return c.json({ error: 'Restaurant not found' }, 404)
  const input = c.req.valid('json')
  await c.env.DB.prepare("INSERT INTO menu_items (restaurant_id, name, description, price, category, image_key, tag, ingredients, allergens, may_contain, dietary_tags, halal_status, spice_level, status, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)").bind(restaurant.id, input.name, input.description, input.price, input.category, input.imageKey ?? null, input.tag ?? null, input.ingredients ?? '', JSON.stringify(input.allergens ?? []), JSON.stringify(input.mayContain ?? []), JSON.stringify(input.dietaryTags ?? []), input.halalStatus ?? 'UNKNOWN', input.spiceLevel ?? null, (input as Record<string, unknown>).isSpecial ? 1 : 0).run()
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
  const columnMap: Record<string, string> = { imageKey: 'image_key', mayContain: 'may_contain', dietaryTags: 'dietary_tags', halalStatus: 'halal_status', spiceLevel: 'spice_level', sortOrder: 'sort_order', isSpecial: 'is_special' }
  const jsonFields: Record<string, true> = { allergens: true, mayContain: true, dietaryTags: true }
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
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE menu_items SET status = \'PUBLISHED\', archived = 0, updated_at = CURRENT_TIMESTAMP WHERE restaurant_id = ? AND status = \'DRAFT\' AND archived = 0').bind(restaurant.id),
    c.env.DB.prepare('UPDATE restaurants SET published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(restaurant.id),
  ])
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

app.all('*', c => c.env.ASSETS.fetch(c.req.raw))

export default app
