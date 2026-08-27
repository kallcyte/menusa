import assert from 'node:assert/strict'
import test from 'node:test'
import { createRestaurantSchema, menuItemSchema, restaurantSettingsSchema } from '../server/schemas'

test('accepts a valid menu item', () => {
  const result = menuItemSchema.safeParse({ name: 'Charred octopus', description: 'Saffron potato', price: 18, category: 'From the sea' })
  assert.equal(result.success, true)
})

test('rejects negative prices and oversized descriptions', () => {
  const result = menuItemSchema.safeParse({ name: 'Dish', description: 'x'.repeat(241), price: -1, category: 'Mains' })
  assert.equal(result.success, false)
})

test('rejects blank names and categories', () => {
  const result = menuItemSchema.safeParse({ name: '', description: '', price: 10, category: '' })
  assert.equal(result.success, false)
})

test('accepts lowercase hyphenated restaurant slugs', () => {
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'salt-and-ember' }).success, true)
  assert.equal(restaurantSettingsSchema.safeParse({ slug: 'Salt & Ember' }).success, false)
})

test('accepts a complete restaurant profile', () => {
  assert.equal(createRestaurantSchema.safeParse({ slug: 'alba-house', name: 'Alba House', description: 'Small plates', address: '8 North Street', hours: 'Open until 10:30 PM' }).success, true)
})

test('requires a name when creating a restaurant', () => {
  assert.equal(createRestaurantSchema.safeParse({ slug: 'alba-house', description: '', address: '', hours: '' }).success, false)
})

test('accepts a sort order for menu items', () => {
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', sortOrder: 3 }).success, true)
  assert.equal(menuItemSchema.safeParse({ name: 'Dish', description: '', price: 10, category: 'Mains', sortOrder: -1 }).success, false)
})

test('accepts structured menu item details', () => {
  const result = menuItemSchema.safeParse({
    name: 'Roasted miso aubergine',
    description: 'Sesame, crispy shallot',
    price: 16,
    category: 'Small plates',
    ingredients: 'Aubergine, miso, sesame',
    allergens: ['soya', 'sesame'],
    mayContain: ['cereals-gluten'],
    dietaryTags: ['VEGAN'],
    halalStatus: 'HALAL_INGREDIENTS',
    spiceLevel: 'MILD',
  })
  assert.equal(result.success, true)
})

test('rejects unknown allergens and halal statuses', () => {
  const result = menuItemSchema.safeParse({
    name: 'Dish',
    description: '',
    price: 10,
    category: 'Mains',
    allergens: ['hazelnut'],
    halalStatus: 'CERTIFIED',
  })
  assert.equal(result.success, false)
})
