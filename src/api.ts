import { menuItems, restaurants, type MenuItem, type Restaurant } from './data'

export type AuthSession = { user: { id: string; name: string; email: string }; session: { id: string; expiresAt: string } }
export type AdminRestaurant = { id: string; slug: string; name: string; description: string; address: string; hours: string; published: number }

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

function imageFor(item: { image?: string; imageKey?: string | null; name: string }, admin = false) {
  if (item.image) return item.image
  if (item.imageKey) return admin ? `/api/admin/images/${encodeURIComponent(item.imageKey)}` : `/api/images/${encodeURIComponent(item.imageKey)}`
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

export function createAdminRestaurant(input: Pick<AdminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours'>) {
  return request<{ restaurant: AdminRestaurant }>('/api/admin/restaurants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}

export async function fetchAdminItems(restaurantId?: string): Promise<MenuItem[]> {
  const result = await request<{ items: Array<MenuItem & { imageKey?: string }> }>(`/api/admin/items${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`)
  return result.items.map(item => ({ ...item, image: imageFor(item, true) }))
}

export function updateAdminRestaurant(input: Pick<AdminRestaurant, 'slug' | 'name' | 'description' | 'address' | 'hours'>, restaurantId?: string) {
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
    const result = await request<{ restaurant: Partial<Omit<Restaurant, 'items'>>; items: Array<MenuItem & { imageKey?: string }> }>(`/api/menu/${encodeURIComponent(slug)}`)
    return {
      ...fallback,
      ...result.restaurant,
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
  return request<{ ok: boolean }>(`/api/admin/items${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), category: item.category, tag: item.tag, imageKey: item.imageKey, ingredients: item.ingredients, allergens: item.allergens, mayContain: item.mayContain, dietaryTags: item.dietaryTags, halalStatus: item.halalStatus, spiceLevel: item.spiceLevel }) })
}

export function archiveAdminItem(id: string, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'DELETE' })
}

export function restoreAdminItem(id: string, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT' }) })
}

export function updateAdminItem(item: Pick<MenuItem, 'id' | 'name' | 'description' | 'price' | 'category' | 'tag' | 'imageKey' | 'ingredients' | 'allergens' | 'mayContain' | 'dietaryTags' | 'halalStatus' | 'spiceLevel'>, restaurantId?: string) {
  return request<{ ok: boolean }>(`/api/admin/items/${item.id}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), category: item.category, tag: item.tag, imageKey: item.imageKey, ingredients: item.ingredients, allergens: item.allergens, mayContain: item.mayContain, dietaryTags: item.dietaryTags, halalStatus: item.halalStatus, spiceLevel: item.spiceLevel }) })
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
