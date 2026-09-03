-- Replace the demo restaurant's western menu with an Indonesian menu.
DELETE FROM menu_items WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'demo');

UPDATE restaurants
SET name = 'Warung Nusantara',
    description = 'Masakan Indonesia dari dapur ke meja — resep rumahan, rempah pilihan, dan bahan segar setiap hari.',
    address = 'Jl. Senopati No. 14, Jakarta Selatan',
    hours = 'Buka hari ini · sampai 22:30',
    story = 'Hidangan Nusantara yang akrab dengan sentuhan hangat untuk makan bersama.',
    phone = '021 4567 8901',
    instagram = 'warungnusantara',
    hours_detail = 'Sen–Kam 11–22 · Jum–Sab 11–22:30 · Min 12–21'
WHERE slug = 'demo';

INSERT INTO menu_items (restaurant_id, name, description, price, category, tag, sort_order, status, halal_status, spice_level, is_special)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Lumpia Semarang', 'Lumpia renyah isi rebung, ayam, udang, dan saus bawang putih', 28000, 'Makanan Pembuka', 'Favorit', 0, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Tahu Gejrot Cirebon', 'Tahu goreng, kuah gula jawa, bawang, dan cabai rawit', 22000, 'Makanan Pembuka', 'Pedas', 1, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Perkedel Jagung Minahasa', 'Jagung manis, daun bawang, dan cabai digoreng hingga keemasan', 24000, 'Makanan Pembuka', NULL, 2, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Tempe Mendoan Banyumas', 'Tempe tipis berbalut adonan rempah, disajikan dengan sambal kecap', 25000, 'Makanan Pembuka', 'Nabati', 3, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Otak-Otak Palembang', 'Ikan tenggiri berbumbu dibungkus daun pisang, dengan sambal kacang', 32000, 'Makanan Pembuka', 'Tradisional', 4, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Gado-Gado Jakarta', 'Sayuran rebus, tahu, tempe, telur, dan saus kacang medok', 35000, 'Makanan Pembuka', 'Nabati', 5, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Nasi Campur Bali', 'Nasi putih, ayam suwir, lawar, sate lilit, dan sambal matah', 48000, 'Makanan Utama', 'Pilihan Chef', 6, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 1),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Rendang Sapi Minang', 'Daging sapi dimasak perlahan dengan santan dan rempah pilihan', 65000, 'Makanan Utama', 'Pilihan Chef', 7, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Ayam Goreng Kremes', 'Ayam goreng renyah dengan kremesan gurih, sambal terasi, dan lalapan', 38000, 'Makanan Utama', 'Favorit', 8, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Nasi Goreng Kampung', 'Nasi goreng wok, telur mata sapi, kerupuk, dan acar timun', 42000, 'Makanan Utama', 'Favorit', 9, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Soto Ayam Lamongan', 'Kuah kuning bening, ayam suwir, soun, telur, dan koya gurih', 38000, 'Makanan Utama', 'Tradisional', 10, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Rawon Surabaya', 'Daging sapi empuk dalam kuah kluwek hitam, tauge, dan telur asin', 52000, 'Makanan Utama', 'Tradisional', 11, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Gudeg Jogja', 'Nangka muda manis gurih, ayam, telur, krecek, dan nasi hangat', 45000, 'Makanan Utama', 'Tradisional', 12, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Sate Ayam Madura', 'Sate ayam bakar, bumbu kacang, lontong, dan sambal kecap', 55000, 'Makanan Utama', 'Pilihan Chef', 13, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MILD', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Bebek Madura Sambal Hitam', 'Bebek ungkep goreng dengan bumbu hitam khas Madura dan nasi putih', 58000, 'Makanan Utama', 'Pedas', 14, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Nasi Liwet Sunda', 'Nasi gurih, ayam suwir, tahu, lalapan, dan sambal terasi', 46000, 'Makanan Utama', 'Baru', 15, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Ikan Bakar Jimbaran', 'Ikan segar bakar arang dengan sambal matah dan plecing kangkung', 75000, 'Dari Laut', 'Pilihan Chef', 16, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 1),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Pepes Ikan Kemangi', 'Ikan berbumbu rempah, tomat, dan kemangi yang dikukus dalam daun pisang', 48000, 'Dari Laut', 'Segar', 17, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Udang Balado', 'Udang besar tumis sambal balado, tomat, dan jeruk limau', 62000, 'Dari Laut', 'Pedas', 18, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Cumi Sambal Hijau', 'Cumi segar dengan sambal cabai hijau, bawang, dan daun jeruk', 65000, 'Dari Laut', 'Pedas', 19, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Pindang Patin Palembang', 'Ikan patin dalam kuah asam pedas dengan nanas dan kemangi', 50000, 'Dari Laut', 'Tradisional', 20, 'PUBLISHED', 'HALAL_INGREDIENTS', 'MEDIUM', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Kepiting Saus Padang', 'Kepiting segar dengan saus Padang, cabai, jahe, dan rempah', 98000, 'Dari Laut', 'Pilihan Chef', 21, 'PUBLISHED', 'HALAL_INGREDIENTS', 'HOT', 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Es Teh Manis', 'Teh melati dingin dengan gula batu, sederhana dan menyegarkan', 15000, 'Minuman', 'Favorit', 22, 'PUBLISHED', 'UNKNOWN', NULL, 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Es Jeruk Peras', 'Jeruk peras segar, es batu, dan sedikit gula', 18000, 'Minuman', 'Segar', 23, 'PUBLISHED', 'UNKNOWN', NULL, 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Es Cendol Dawet', 'Cendol pandan, santan, gula jawa, dan nangka', 22000, 'Minuman', 'Tradisional', 24, 'PUBLISHED', 'UNKNOWN', NULL, 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Bajigur', 'Minuman hangat santan, gula aren, jahe, dan sedikit kayu manis', 20000, 'Minuman', 'Tradisional', 25, 'PUBLISHED', 'UNKNOWN', NULL, 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Wedang Jahe', 'Seduhan jahe merah, serai, jeruk nipis, dan gula aren', 18000, 'Minuman', 'Segar', 26, 'PUBLISHED', 'UNKNOWN', NULL, 0),
  ((SELECT id FROM restaurants WHERE slug = 'demo'), 'Jus Alpukat Gula Aren', 'Alpukat lembut diblender dengan susu dan gula aren', 28000, 'Minuman', 'Baru', 27, 'PUBLISHED', 'UNKNOWN', NULL, 0);
