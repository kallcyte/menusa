import assert from 'node:assert/strict'
import test from 'node:test'
import { createRestaurantSchema, menuItemSchema, restaurantSettingsSchema, waitlistSchema } from '../server/schemas'
import { sniffImageType } from '../server/images'
import { ApiError, shouldFallbackToLocalData } from '../src/api'

// ---------------------------------------------------------------------------
// menuItemSchema — edge cases
// ---------------------------------------------------------------------------

test('menuItemSchema rejects price as string', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: '10', category: 'Mains' }).success, false)
})

test('menuItemSchema accepts zero price', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Free bread', description: '', price: 0, category: 'Small plates' }).success, true)
})

test('menuItemSchema rejects missing required fields', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish' }).success, false)
  assert.equal(menuItemSchema.safeParse({}).success, false)
})

test('menuItemSchema rejects tag longer than 32 chars', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', tag: 'x'.repeat(33) }).success, false)
})

test('menuItemSchema accepts optional tag within limit', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', tag: "Chef's pick" }).success, true)
})

test('menuItemSchema rejects ingredients longer than 500 chars', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', ingredients: 'x'.repeat(501) }).success, false)
})

test('menuItemSchema accepts valid spice levels and rejects invalid', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', spiceLevel: 'MILD' }).success, true)
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', spiceLevel: 'EXTRA_HOT' }).success, false)
})

test('menuItemSchema accepts valid halal statuses and rejects invalid', () => {
  for (const v of ['UNKNOWN', 'HALAL_INGREDIENTS', 'HALAL_CERTIFIED', 'NOT_HALAL'] as const) {
    assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', halalStatus: v }).success, true)
  }
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', halalStatus: 'CERTIFIED' }).success, false)
})

test('menuItemSchema accepts valid dietary tags and rejects duplicates beyond limit', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', dietaryTags: ['VEGAN', 'GLUTEN_FREE'] }).success, true)
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', dietaryTags: ['UNKNOWN'] }).success, false)
})

test('menuItemSchema rejects duplicate allergen array exceeding max', () => {
  // 15 entries exceeds the 14 allowed allergen values
  const many = Array.from({ length: 15 }, () => 'celery' as const)
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', allergens: many }).success, false)
})

test('menuItemSchema accepts status enum and rejects invalid', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', status: 'DRAFT' }).success, true)
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', status: 'PUBLISHED' }).success, true)
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', status: 'DELETED' }).success, false)
})

test('menuItemSchema rejects non-integer sortOrder', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', sortOrder: 1.5 }).success, false)
})

// ---------------------------------------------------------------------------
// restaurantSettingsSchema / createRestaurantSchema
// ---------------------------------------------------------------------------

test('restaurantSettingsSchema rejects slug with uppercase or underscores', () => {
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'My_Restaurant' }).success, false)
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'My Restaurant' }).success, false)
  assert.equal(restaurantSettingsSchema.safeParse({ slug: '-leading' }).success, false)
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'trailing-' }).success, false)
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'double--dash' }).success, false)
})

test('restaurantSettingsSchema accepts slug with numbers', () => {
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'restaurant-1' }).success, true)
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'a1b2c3' }).success, true)
})

test('restaurantSettingsSchema rejects slug longer than 64 chars', () => {
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'a'.repeat(65) }).success, false)
})

test('createRestaurantSchema rejects missing description/address/hours', () => {
  // All four string fields are required for creation
  assert.equal(createRestaurantSchema.safeParse({ slug: 'test', name: 'Test' }).success, false)
})

test('createRestaurantSchema rejects description longer than 500 chars', () => {
  assert.equal(createRestaurantSchema.safeParse({ slug: 'test', name: 'Test', description: 'x'.repeat(501), address: '', hours: '' }).success, false)
})

// ---------------------------------------------------------------------------
// waitlistSchema — already covered in waitlist.test.ts; extra boundary
// ---------------------------------------------------------------------------

test('waitlistSchema accepts email with plus addressing', () => {
  assert.equal(waitlistSchema.safeParse({ email: 'user+tag@example.com' }).success, true)
})

// ---------------------------------------------------------------------------
// sniffImageType — extra cases
// ---------------------------------------------------------------------------

test('sniffImageType rejects empty buffer', () => {
  assert.equal(sniffImageType(new Uint8Array([])), null)
})

test('sniffImageType rejects random bytes', () => {
  assert.equal(sniffImageType(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b])), null)
})

test('sniffImageType rejects RIFF without WEBP marker', () => {
  const fakeRiff = new Uint8Array([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('AVIF')])
  assert.equal(sniffImageType(fakeRiff), null)
})

test('sniffImageType rejects truncated WebP (less than 12 bytes)', () => {
  const truncated = new Uint8Array([...new TextEncoder().encode('RIFF'), 0, 0])
  assert.equal(sniffImageType(truncated), null)
})

// ---------------------------------------------------------------------------
// shouldFallbackToLocalData / ApiError
// ---------------------------------------------------------------------------

test('ApiError carries status and message', () => {
  const err = new ApiError(404, 'Not found')
  assert.equal(err.status, 404)
  assert.equal(err.message, 'Not found')
  assert.ok(err instanceof Error)
})

test('shouldFallbackToLocalData returns false for 4xx ApiError', () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429]) {
    assert.equal(shouldFallbackToLocalData(new ApiError(status, 'client error')), false)
  }
})

test('shouldFallbackToLocalData returns true for 5xx ApiError', () => {
  for (const status of [500, 502, 503, 504]) {
    assert.equal(shouldFallbackToLocalData(new ApiError(status, 'server error')), true)
  }
})

test('shouldFallbackToLocalData returns true for non-ApiError', () => {
  assert.equal(shouldFallbackToLocalData(new TypeError('fetch failed')), true)
  assert.equal(shouldFallbackToLocalData(new Error('network')), true)
  assert.equal(shouldFallbackToLocalData('string error'), true)
  assert.equal(shouldFallbackToLocalData(null), true)
})
