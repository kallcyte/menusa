import { menuItems, restaurants, type MenuItem, type Restaurant } from './data'

export type AuthSession = { user: { id: string; name: string; email: string; role?: string }; session: { id: string; expiresAt: string } }
export type HalalCertificationAuthority = 'BPJPH' | 'MUI'
export type AdminRestaurant = { id: string; slug: string; name: string; description: string; address: string; hours: string; published: number; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: { title: string; description?: string; badge?: string; validUntil?: string; type?: string } | null; currency?: string; halalCertificationAuthority?: HalalCertificationAuthority; halalCertificationNumber?: string; halalCertificateImageKey?: string; banner?: { type: 'none' | 'promo' | 'announcement'; promo?: { title: string; description?: string; badge?: string; validUntil?: string; type?: string } | null; announcement?: string; dismissible?: boolean } | null }
export type SuperadminUser = { id: string; name: string; email: string; role: string; createdAt: string; username?: string | null; restaurantIds?: string[] }
export type SuperadminRestaurant = { id: string; slug: string; name: string; description: string; address: string; hours: string; published: number; ownerId: string; ownerEmail: string | null; createdAt: string; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: { title: string; description?: string; badge?: string; validUntil?: string; type?: string } | null; currency?: string; halalCertificationAuthority?: HalalCertificationAuthority; halalCertificationNumber?: string; halalCertificateImageKey?: string; banner?: { type: 'none' | 'promo' | 'announcement'; promo?: unknown; announcement?: string; dismissible?: boolean } | null }
export type WaitlistEntry = { id: string; email: string; restaurantName: string | null; createdAt: string }

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: 'include', ...init })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; message?: string } | null
    throw new ApiError(response.status, body?.error ?? body?.message ?? 'Request failed')
  }
  return response.json()
}

export function isNetworkError(err: unknown) {
  return !(err instanceof ApiError)
}

/** True for network failures and server-side 5xx — the demo-friendly fallback cases. */
export function shouldFallbackToLocalData(err: unknown) {
  return isNetworkError(err) || (err instanceof ApiError && err.status >= 500)
}

function imageFor(item: { image?: string; imageKey?: string | null; name: string }, admin = false, superadmin = false) {
  if (item.image) return item.image
  if (item.imageKey) {
    if (superadmin) return `/api/superadmin/images/${encodeURIComponent(item.imageKey)}`
    if (admin) return `/api/admin/images/${encodeURIComponent(item.imageKey)}`
    return `/api/images/${encodeURIComponent(item.imageKey)}`
  }
  return menuItems.find(fixture => fixture.name === item.name)?.image ?? ''
}

export async function fetchSession(): Promise<AuthSession | null> {
  try { return await request<AuthSession | null>('/api/auth/get-session') } catch { return null }
}

export async function logout() {
  return request<{ success: boolean }>('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
}

export function updateAccountName(name: string) {
  return request<{ status: boolean }>('/api/auth/update-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
}

export function updateAccountEmail(newEmail: string) {
  return request<{ status: boolean }>('/api/auth/change-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newEmail }) })
}

export function updateAccountPassword(currentPassword: string, newPassword: string) {
  return request<{ status: boolean }>('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }) })
}

export function deleteAccount(password: string) {
  return request<{ success: boolean }>('/api/auth/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
}

export async function fetchAdminRestaurants() {
  return request<{ restaurants: AdminRestaurant[] }>('/api/admin/restaurants')
}

export function createAdminRestaurant(input: Pick<AdminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours' | 'story' | 'phone' | 'instagram' | 'hoursDetail' | 'promo'>) {
  return request<{ restaurant: AdminRestaurant }>('/api/admin/restaurants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}

export async function fetchAdminItems(restaurantId?: string): Promise<MenuItem[]> {
  const result = await request<{ items: Array<MenuItem & { imageKey?: string }> }>(`/api/admin/items${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`)
  return result.items.map(item => ({ ...item, image: imageFor(item, true) }))
}

export function updateAdminRestaurant(input: Pick<AdminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours' | 'story' | 'phone' | 'instagram' | 'hoursDetail' | 'promo' | 'halalCertificationAuthority' | 'halalCertificationNumber' | 'halalCertificateImageKey'> & { currency?: string; bannerType?: string; bannerPromoId?: string | null; bannerAnnouncement?: string | null; bannerDismissible?: boolean }, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/restaurant${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}

export function reorderAdminItem(id: string, sortOrder: number, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder }) })
}

export function signUp(email: string, password: string, name: string) {
  return request('/api/auth/sign-up/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) })
}

export async function fetchPublicMenu(slug: string): Promise<Restaurant> {
  const fallback = restaurants[slug] ?? restaurants['restaurant-1']
  try {
    const result = await request<{ restaurant: Partial<Omit<Restaurant, 'items'>> & { menuVisible?: boolean }; items: Array<MenuItem & { imageKey?: string }> }>(`/api/menu/${encodeURIComponent(slug)}`)
    return {
      ...fallback,
      ...result.restaurant,
      menuVisible: result.restaurant.menuVisible !== false,
      accent: result.restaurant.accent ?? fallback.accent,
      address: result.restaurant.address ?? fallback.address,
      hours: result.restaurant.hours ?? fallback.hours,
      items: result.items.map(item => ({ ...item, image: imageFor(item) })),
    }
  } catch (err) {
    if (!shouldFallbackToLocalData(err)) throw err
    return fallback
  }
}

export function createAdminItem(item: MenuItem, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), category: item.category, tag: item.tag, imageKey: item.imageKey, ingredients: item.ingredients, allergens: item.allergens, mayContain: item.mayContain, dietaryTags: item.dietaryTags, halalStatus: item.halalStatus, spiceLevel: item.spiceLevel, isSpecial: item.isSpecial }) })
}

export function archiveAdminItem(id: string, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'DELETE' })
}

export function restoreAdminItem(id: string, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT' }) })
}

export function updateAdminItem(item: Pick<MenuItem, 'id' | 'name' | 'description' | 'price' | 'category' | 'tag' | 'imageKey' | 'ingredients' | 'allergens' | 'mayContain' | 'dietaryTags' | 'halalStatus' | 'spiceLevel' | 'isSpecial'>, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${item.id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), category: item.category, tag: item.tag, imageKey: item.imageKey, ingredients: item.ingredients, allergens: item.allergens, mayContain: item.mayContain, dietaryTags: item.dietaryTags, halalStatus: item.halalStatus, spiceLevel: item.spiceLevel, isSpecial: item.isSpecial }) })
}

export function publishAdminItem(id: string, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PUBLISHED' }) })
}

export function draftAdminItem(id: string, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT' }) })
}

export async function uploadMenuImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<{ key: string }>('/api/admin/images', { method: 'POST', body: form })
}

export function publishAdminMenu(restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/publish${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'POST' })
}

export function unpublishAdminMenu(restaurantId?: string) {
   return request<{ ok: boolean }>(`/api/admin/unpublish${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'POST' })
 }

export function setRestaurantVisibility(published: boolean, restaurantId?: string) {
  return request<{ ok: boolean; published: number }>(`/api/admin/visibility${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published }) })
}


export function joinWaitlist(email: string, restaurantName?: string) {
   return request<{ ok: boolean; already?: boolean }>('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, restaurantName: restaurantName || undefined }) })
 }

export function fetchWaitlist() {
  return request<{ entries: WaitlistEntry[] }>('/api/superadmin/waitlist')
}

export function fetchSuperadminMe() {
  return request<{ user: { id: string; email: string; name: string; role: string } }>('/api/superadmin/me')
}

export function fetchSuperadminWaitlist() {
  return request<{ entries: WaitlistEntry[] }>('/api/superadmin/waitlist')
}

export function fetchSuperadminUsers() {
  return request<{ users: SuperadminUser[] }>('/api/superadmin/users')
}

export function updateSuperadminUserRole(id: string, role: 'user' | 'superadmin') {
  return request<{ ok: boolean }>(`/api/superadmin/users/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
}

export function deleteSuperadminUser(id: string) {
  return request<{ ok: boolean }>(`/api/superadmin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchSuperadminRestaurants() {
  return request<{ restaurants: SuperadminRestaurant[] }>('/api/superadmin/restaurants')
}

export function createSuperadminRestaurant(input: Pick<SuperadminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours'>) {
  return request<{ restaurant: SuperadminRestaurant }>('/api/superadmin/restaurants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}


export function fetchSuperadminRestaurant(id: string) {
  return request<{ restaurant: SuperadminRestaurant }>(`/api/superadmin/restaurants/${encodeURIComponent(id)}`)
}
export function updateSuperadminRestaurant(id: string, input: Pick<SuperadminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours' | 'story' | 'phone' | 'instagram' | 'hoursDetail' | 'promo'>) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}
export function deleteSuperadminRestaurant(id: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
export function transferSuperadminRestaurantOwnership(restaurantId: string, ownerId: string, removePreviousOwnerAccess = true) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/owner`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId, removePreviousOwnerAccess }) })
}
export async function fetchSuperadminItems(restaurantId: string) {
  const result = await request<{ items: Array<MenuItem & { imageKey?: string }> }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items`)
  return { items: result.items.map(item => ({ ...item, image: imageFor(item, false, true) })) }
}
export function createSuperadminItem(restaurantId: string, item: MenuItem) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), category: item.category, tag: item.tag, imageKey: item.imageKey, ingredients: item.ingredients, allergens: item.allergens, mayContain: item.mayContain, dietaryTags: item.dietaryTags, halalStatus: item.halalStatus, spiceLevel: item.spiceLevel, isSpecial: item.isSpecial }) })
}
export function updateSuperadminItem(restaurantId: string, item: Pick<MenuItem, 'id' | 'name' | 'description' | 'price' | 'category' | 'tag' | 'imageKey' | 'ingredients' | 'allergens' | 'mayContain' | 'dietaryTags' | 'halalStatus' | 'spiceLevel' | 'isSpecial'>) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), category: item.category, tag: item.tag, imageKey: item.imageKey, ingredients: item.ingredients, allergens: item.allergens, mayContain: item.mayContain, dietaryTags: item.dietaryTags, halalStatus: item.halalStatus, spiceLevel: item.spiceLevel, isSpecial: item.isSpecial }) })
}
export function archiveSuperadminItem(restaurantId: string, id: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
export function restoreSuperadminItem(restaurantId: string, id: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT' }) })
}
export function publishSuperadminItem(restaurantId: string, id: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PUBLISHED' }) })
}
export function draftSuperadminItem(restaurantId: string, id: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT' }) })
}
export function reorderSuperadminItem(restaurantId: string, id: string, sortOrder: number) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/items/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder }) })
}
export function publishSuperadminMenu(restaurantId: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/publish`, { method: 'POST' })
}
export function unpublishSuperadminMenu(restaurantId: string) {
  return request<{ ok: boolean }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/unpublish`, { method: 'POST' })
}
export function setSuperadminVisibility(restaurantId: string, published: boolean) {
  return request<{ ok: boolean; published: number }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/visibility`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published }) })
}
export function uploadSuperadminImage(restaurantId: string, file: File) {
  const body = new FormData()
  body.set('file', file)
  return request<{ key: string }>(`/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/images`, { method: 'POST', body })
}

export function sendSuperadminBroadcast(input: { audience: 'waitlist' | 'users' | 'all'; subject: string; html: string; text: string }) {
  return request<{ ok: boolean; sent: number; skipped?: boolean; reason?: string }>('/api/superadmin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}
export function createSuperadminUser(input: { name: string; username: string; email: string; password: string; role?: 'user' | 'superadmin'; restaurantIds?: string[] }) {
  return request<{ user: SuperadminUser }>('/api/superadmin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}
export function updateSuperadminUser(id: string, patch: { name?: string; username?: string; email?: string; role?: 'user' | 'superadmin'; restaurantIds?: string[] }) {
  return request<{ ok: boolean }>(`/api/superadmin/users/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
}
export function resetSuperadminPassword(id: string, password: string) {
  return request<{ ok: boolean }>(`/api/superadmin/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
}
export function fetchCampaigns(params?: { q?: string; category?: string; tag?: string }) {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.category) qs.set('category', params.category)
  if (params?.tag) qs.set('tag', params.tag)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request<{ campaigns: Array<{ id: string; subject: string; html: string; text: string; audience: string; tags: string; category: string | null; status: string; sent_count: number; created_at: string; sent_at: string | null }> }>(`/api/superadmin/campaigns${suffix}`)
}
export function createCampaign(input: { subject: string; html: string; text: string; audience: 'waitlist' | 'users' | 'all'; category?: string; tags?: string[] }) {
  return request<{ ok: boolean; sent: number; campaign: { id: string } }>('/api/superadmin/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}
export function fetchAdminPromos(restaurantId?: string) {
  const qs = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''
  return request<{ promos: Array<{ id: string; title: string; description: string | null; badge: string | null; type: string; status: string; valid_from: string | null; valid_until: string | null; applies_to: string; applies_ids: string; stackable: number; min_purchase: number | null; created_at: string }> }>(`/api/admin/promos${qs}`)
}
export function createPromo(input: Record<string, unknown>, restaurantId?: string) {
  const qs = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''
  return request<{ promo: { id: string } }>(`/api/admin/promos${qs}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}
export function updatePromo(id: string, patch: Record<string, unknown>, restaurantId?: string) {
  const qs = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''
  return request<{ ok: boolean }>(`/api/admin/promos/${encodeURIComponent(id)}${qs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
}
export function deletePromo(id: string, restaurantId?: string) {
  const qs = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''
  return request<{ ok: boolean }>(`/api/admin/promos/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' })
}
