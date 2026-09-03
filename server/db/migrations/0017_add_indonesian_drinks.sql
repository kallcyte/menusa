-- Add two more Indonesian drinks to the demo menu for desktop balance.
INSERT INTO menu_items (restaurant_id, name, description, price, category, tag, sort_order, status, halal_status, spice_level, is_special)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Es Doger', 'Es serut, santan, tape singkong, alpukat, dan sirup merah khas Bandung', 24000, 'Minuman', 'Tradisional', 28, 'PUBLISHED', 'UNKNOWN', NULL, 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Es Selendang Mayang', 'Kue kanji warna-warni, santan, dan kuah gula jawa yang dingin menyegarkan', 22000, 'Minuman', 'Baru', 29, 'PUBLISHED', 'UNKNOWN', NULL, 0);
