export type MenuItemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type Allergen = 'celery' | 'cereals-gluten' | 'crustaceans' | 'eggs' | 'fish' | 'lupin' | 'milk' | 'molluscs' | 'mustard' | 'nuts' | 'peanuts' | 'sesame' | 'soya' | 'sulphites'
export type DietaryTag = 'VEGAN' | 'VEGETARIAN' | 'GLUTEN_FREE' | 'DAIRY_FREE' | 'NON_ALCOHOLIC'
export type HalalStatus = 'UNKNOWN' | 'HALAL_INGREDIENTS' | 'HALAL_CERTIFIED' | 'NOT_HALAL'
export type SpiceLevel = 'MILD' | 'MEDIUM' | 'HOT'
export type PromoType = 'bogo' | 'discount' | 'package' | 'custom'
export type Promo = { title: string; description?: string; badge?: string; validUntil?: string; type?: PromoType }
export type MenuItem = { id: string; name: string; description: string; price: string; category: string; image: string; imageKey?: string; tag?: string; accent?: string; status?: MenuItemStatus; ingredients?: string; allergens?: Allergen[]; mayContain?: Allergen[]; dietaryTags?: DietaryTag[]; halalStatus?: HalalStatus; spiceLevel?: SpiceLevel; isSpecial?: boolean }
export type Restaurant = { id?: string; slug: string; name: string; description: string; address: string; hours: string; accent: string; items: MenuItem[]; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: Promo | null }

export const categories = ['All', 'Small plates', 'Mains', 'From the sea', 'Drinks']
export const tagSuggestions = ["Chef's pick", 'Plant-based', 'Bright & fresh', 'Seasonal', 'Staff favorite', 'New']
export const allergenOptions: Array<{ value: Allergen; label: string }> = [
  { value: 'celery', label: 'Celery' },
  { value: 'cereals-gluten', label: 'Cereals containing gluten' },
  { value: 'crustaceans', label: 'Crustaceans' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'fish', label: 'Fish' },
  { value: 'lupin', label: 'Lupin' },
  { value: 'milk', label: 'Milk' },
  { value: 'molluscs', label: 'Molluscs' },
  { value: 'mustard', label: 'Mustard' },
  { value: 'nuts', label: 'Nuts' },
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'soya', label: 'Soya' },
  { value: 'sulphites', label: 'Sulphites' },
]
export const dietaryTagOptions: Array<{ value: DietaryTag; label: string }> = [
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'GLUTEN_FREE', label: 'Gluten-free' },
  { value: 'DAIRY_FREE', label: 'Dairy-free' },
  { value: 'NON_ALCOHOLIC', label: 'Non-alcoholic' },
]
export const halalStatusOptions: Array<{ value: HalalStatus; label: string }> = [
  { value: 'UNKNOWN', label: 'Not specified' },
  { value: 'HALAL_INGREDIENTS', label: 'Halal ingredients' },
  { value: 'HALAL_CERTIFIED', label: 'Halal-certified' },
  { value: 'NOT_HALAL', label: 'Not halal' },
]
export const spiceLevelOptions: Array<{ value: SpiceLevel; label: string }> = [
  { value: 'MILD', label: 'Mild' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HOT', label: 'Hot' },
]
export const menuItems: MenuItem[] = [
  { id: '1', name: 'Charred octopus', description: 'Saffron potato, preserved lemon, smoked paprika oil', price: '18', category: 'From the sea', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85', tag: "Chef's pick", accent: 'coral', isSpecial: true },
  { id: '2', name: 'Green olive sourdough', description: 'Whipped sea salt butter, aged balsamic', price: '8', category: 'Small plates', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85' },
  { id: '3', name: 'Roasted miso aubergine', description: 'Sesame, crispy shallot, spring herbs', price: '16', category: 'Small plates', image: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?auto=format&fit=crop&w=900&q=85', tag: 'Plant-based' },
  { id: '4', name: 'Seared market fish', description: 'Today’s catch, tomato broth, fennel & basil', price: '27', category: 'From the sea', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85' },
  { id: '5', name: 'Ember-roasted chicken', description: 'Green harissa, grilled flatbread, cooling labneh', price: '24', category: 'Mains', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=85' },
  { id: '6', name: 'Salted cacao cloud', description: 'Dark chocolate, olive oil, sour cream', price: '11', category: 'Mains', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85' },
  { id: '7', name: 'Citrus spritz', description: 'Bergamot, bitter orange, sparkling wine', price: '13', category: 'Drinks', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=85', tag: 'Bright & fresh' },
  { id: '8', name: 'Coastal negroni', description: 'Gin, vermouth, sea buckthorn, bitters', price: '14', category: 'Drinks', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85', isSpecial: true },
]

export const restaurants: Record<string, Restaurant> = {
  'restaurant-1': { id: 'restaurant-1', slug: 'restaurant-1', name: 'Salt & Ember', description: 'A menu inspired by the shoreline, the market, and the people around our table.', address: '14 Harbour Lane, Brighton', hours: 'Open today · until 11:30 PM', accent: 'salt', items: menuItems, story: 'Wood-fired, market-led, and open since 2019 — we cook what the boats bring in.', phone: '01273 456 789', instagram: 'saltandember', hoursDetail: 'Mon–Thu 5–11pm · Fri–Sat 5–11:30pm · Sun 12–10pm', promo: { title: 'Feast for two — £48', description: 'Any 2 mains + 2 drinks, every evening this week.', badge: 'This week', validUntil: 'Until Sunday', type: 'package' } },
  'restaurant-2': { id: 'restaurant-2', slug: 'restaurant-2', name: 'Alba House', description: 'Small plates, long lunches, and wine from the warmer side of the map.', address: '8 North Street, Bristol', hours: 'Open today · until 10:30 PM', accent: 'alba', items: menuItems.map((item, index) => ({ ...item, id: `alba-${item.id}`, name: index === 0 ? 'Burnt peach & stracciatella' : index === 1 ? 'House focaccia' : item.name, category: index < 2 ? 'Small plates' : item.category })), story: 'Small plates, long lunches, and wine from the warmer side of the map.', phone: '0117 234 5678', instagram: 'albahouse.bristol', hoursDetail: 'Tue–Sat 12–10:30pm · Sun 12–6pm', promo: { title: 'Buy 2 get 1 free', description: 'On all small plates — mix and match.', badge: 'Today only', validUntil: 'Today, 12–3pm', type: 'bogo' } },
}
