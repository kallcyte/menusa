import { z } from 'zod'

const allergenValues = ['celery', 'cereals-gluten', 'crustaceans', 'eggs', 'fish', 'lupin', 'milk', 'molluscs', 'mustard', 'nuts', 'peanuts', 'sesame', 'soya', 'sulphites'] as const
const dietaryTagValues = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'NON_ALCOHOLIC'] as const

export const menuItemSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240),
  price: z.number().nonnegative(),
  category: z.string().min(1),
  tag: z.string().max(32).optional(),
  imageKey: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  ingredients: z.string().max(500).optional(),
  allergens: z.array(z.enum(allergenValues)).max(allergenValues.length).optional(),
  mayContain: z.array(z.enum(allergenValues)).max(allergenValues.length).optional(),
  dietaryTags: z.array(z.enum(dietaryTagValues)).max(dietaryTagValues.length).optional(),
  halalStatus: z.enum(['UNKNOWN', 'HALAL_INGREDIENTS', 'HALAL_CERTIFIED', 'NOT_HALAL']).optional(),
  spiceLevel: z.enum(['MILD', 'MEDIUM', 'HOT']).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

const restaurantSlug = z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const restaurantSettingsSchema = z.object({
  slug: restaurantSlug,
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  address: z.string().max(240).optional(),
  hours: z.string().max(240).optional(),
})

export const createRestaurantSchema = z.object({
  slug: restaurantSlug,
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  address: z.string().max(240),
  hours: z.string().max(240),
})
