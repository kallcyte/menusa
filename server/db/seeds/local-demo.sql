-- Local demo data for development only. Safe to re-run; never apply to production.
UPDATE restaurants SET address = '14 Harbour Lane, Brighton', hours = 'Open today, until 11:30 PM' WHERE slug = 'restaurant-1';

INSERT INTO menu_items (restaurant_id, name, description, price, category, image_key, tag, sort_order)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Charred octopus', 'Saffron potato, preserved lemon, smoked paprika oil', 18, 'From the sea', NULL, 'Chef''s pick', 0),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Green olive sourdough', 'Whipped sea salt butter, aged balsamic', 8, 'Small plates', NULL, NULL, 1),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Roasted miso aubergine', 'Sesame, crispy shallot, spring herbs', 16, 'Small plates', NULL, 'Plant-based', 2),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Seared market fish', 'Today''s catch, tomato broth, fennel & basil', 27, 'From the sea', NULL, NULL, 3),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Ember-roasted chicken', 'Green harissa, grilled flatbread, cooling labneh', 24, 'Mains', NULL, NULL, 4),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Salted cacao cloud', 'Dark chocolate, olive oil, sour cream', 11, 'Mains', NULL, NULL, 5),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Citrus spritz', 'Bergamot, bitter orange, sparkling wine', 13, 'Drinks', NULL, 'Bright & fresh', 6),
  ((SELECT id FROM restaurants WHERE slug = 'restaurant-1'), 'Coastal negroni', 'Gin, vermouth, sea buckthorn, bitters', 14, 'Drinks', NULL, NULL, 7);
