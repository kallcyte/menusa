export type MenuItemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type Allergen = 'celery' | 'cereals-gluten' | 'crustaceans' | 'eggs' | 'fish' | 'lupin' | 'milk' | 'molluscs' | 'mustard' | 'nuts' | 'peanuts' | 'sesame' | 'soya' | 'sulphites'
export type DietaryTag = 'VEGAN' | 'VEGETARIAN' | 'GLUTEN_FREE' | 'DAIRY_FREE' | 'NON_ALCOHOLIC'
export type HalalStatus = 'UNKNOWN' | 'HALAL_INGREDIENTS' | 'HALAL_CERTIFIED' | 'NOT_HALAL'
export type SpiceLevel = 'MILD' | 'MEDIUM' | 'HOT'
export type PromoType = 'bogo' | 'discount' | 'package' | 'custom'
export type Promo = { title: string; description?: string; badge?: string; validUntil?: string; type?: PromoType }
export type MenuItem = { id: string; name: string; description: string; price: string; category: string; image: string; imageKey?: string; tag?: string; accent?: string; status?: MenuItemStatus; ingredients?: string; allergens?: Allergen[]; mayContain?: Allergen[]; dietaryTags?: DietaryTag[]; halalStatus?: HalalStatus; spiceLevel?: SpiceLevel; isSpecial?: boolean }
export type HalalCertificationAuthority = 'BPJPH' | 'MUI'
export type Restaurant = { id?: string; slug: string; name: string; description: string; address: string; hours: string; accent: string; items: MenuItem[]; story?: string; phone?: string; instagram?: string; hoursDetail?: string; promo?: Promo | null; menuVisible?: boolean; currency?: string; halalCertificationAuthority?: HalalCertificationAuthority; halalCertificationNumber?: string; halalCertificateImageKey?: string; banner?: { type: 'none' | 'promo' | 'announcement'; promo?: Promo | null; announcement?: string; dismissible?: boolean } | null }

// Canonical slugs stored in DB; display labels resolved via i18n (common: categories.*)
export const categorySlugs = ['small-plates', 'mains', 'from-the-sea', 'drinks'] as const
export type CategorySlug = typeof categorySlugs[number]
export const categories = ['Semua', 'Makanan Pembuka', 'Makanan Utama', 'Dari Laut', 'Minuman']
export const categorySlugToLabel: Record<string, string> = {
  'all': 'Semua',
  'small-plates': 'Makanan Pembuka',
  'mains': 'Makanan Utama',
  'from-the-sea': 'Dari Laut',
  'drinks': 'Minuman',
}
export const tagSuggestions = ['Pilihan Chef', 'Nabati', 'Segar', 'Pedas', 'Tradisional', 'Favorit', 'Baru']
export const allergenOptions: Array<{ value: Allergen; label: string }> = [
  { value: 'celery', label: 'Seledri' },
  { value: 'cereals-gluten', label: 'Serealia mengandung gluten' },
  { value: 'crustaceans', label: 'Krustasea' },
  { value: 'eggs', label: 'Telur' },
  { value: 'fish', label: 'Ikan' },
  { value: 'lupin', label: 'Lupin' },
  { value: 'milk', label: 'Susu' },
  { value: 'molluscs', label: 'Moluska' },
  { value: 'mustard', label: 'Mustard' },
  { value: 'nuts', label: 'Kacang pohon' },
  { value: 'peanuts', label: 'Kacang tanah' },
  { value: 'sesame', label: 'Wijen' },
  { value: 'soya', label: 'Kedelai' },
  { value: 'sulphites', label: 'Sulfit' },
]
export const dietaryTagOptions: Array<{ value: DietaryTag; label: string }> = [
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'GLUTEN_FREE', label: 'Bebas gluten' },
  { value: 'DAIRY_FREE', label: 'Bebas susu' },
  { value: 'NON_ALCOHOLIC', label: 'Non-alkohol' },
]
export const halalStatusOptions: Array<{ value: HalalStatus; label: string }> = [
  { value: 'UNKNOWN', label: 'Tidak disebutkan' },
  { value: 'HALAL_INGREDIENTS', label: 'Bahan halal' },
  { value: 'HALAL_CERTIFIED', label: 'Bersertifikat halal' },
  { value: 'NOT_HALAL', label: 'Tidak halal' },
]
export const spiceLevelOptions: Array<{ value: SpiceLevel; label: string }> = [
  { value: 'MILD', label: 'Tidak pedas' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HOT', label: 'Pedas' },
]
export const menuItems: MenuItem[] = [
  { id: '1', name: 'Lumpia Semarang', description: 'Lumpia renyah isi rebung, ayam, udang, dan saus bawang putih', price: '28000', category: 'Makanan Pembuka', image: 'https://images.unsplash.com/photo-1695712641388-87c0f9c2d36e?auto=format&fit=crop&w=900&q=85', tag: 'Favorit', halalStatus: 'HALAL_INGREDIENTS' },
  { id: '2', name: 'Tahu Gejrot Cirebon', description: 'Tahu goreng, kuah gula jawa, bawang, dan cabai rawit', price: '22000', category: 'Makanan Pembuka', image: 'https://images.unsplash.com/photo-1680173073730-852e0ec93bec?auto=format&fit=crop&w=900&q=85', tag: 'Pedas', dietaryTags: ['VEGAN'], halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT' },
  { id: '3', name: 'Perkedel Jagung Minahasa', description: 'Jagung manis, daun bawang, dan cabai digoreng hingga keemasan', price: '24000', category: 'Makanan Pembuka', image: 'https://images.unsplash.com/photo-1754636218784-97b31ea9d052?auto=format&fit=crop&w=900&q=85', dietaryTags: ['VEGAN'], halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '4', name: 'Tempe Mendoan Banyumas', description: 'Tempe tipis berbalut adonan rempah, disajikan dengan sambal kecap', price: '25000', category: 'Makanan Pembuka', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', tag: 'Nabati', dietaryTags: ['VEGAN'], halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '5', name: 'Otak-Otak Palembang', description: 'Ikan tenggiri berbumbu dibungkus daun pisang, dengan sambal kacang', price: '32000', category: 'Makanan Pembuka', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '6', name: 'Gado-Gado Jakarta', description: 'Sayuran rebus, tahu, tempe, telur, dan saus kacang medok', price: '35000', category: 'Makanan Pembuka', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=85', tag: 'Nabati', dietaryTags: ['VEGETARIAN'], halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '7', name: 'Nasi Campur Bali', description: 'Nasi putih, ayam suwir, lawar, sate lilit, dan sambal matah', price: '48000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85', tag: 'Pilihan Chef', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT', isSpecial: true },
  { id: '8', name: 'Rendang Sapi Minang', description: 'Daging sapi dimasak perlahan dengan santan dan rempah pilihan', price: '65000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=85', tag: 'Pilihan Chef', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '9', name: 'Ayam Goreng Kremes', description: 'Ayam goreng renyah dengan kremesan gurih, sambal terasi, dan lalapan', price: '38000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=85', tag: 'Favorit', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '10', name: 'Nasi Goreng Kampung', description: 'Nasi goreng wok, telur mata sapi, kerupuk, dan acar timun', price: '42000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1603133872875-ca2a98a0a862?auto=format&fit=crop&w=900&q=85', tag: 'Favorit', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '11', name: 'Soto Ayam Lamongan', description: 'Kuah kuning bening, ayam suwir, soun, telur, dan koya gurih', price: '38000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '12', name: 'Rawon Surabaya', description: 'Daging sapi empuk dalam kuah kluwek hitam, tauge, dan telur asin', price: '52000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '13', name: 'Gudeg Jogja', description: 'Nangka muda manis gurih, ayam, telur, krecek, dan nasi hangat', price: '45000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '14', name: 'Sate Ayam Madura', description: 'Sate ayam bakar, bumbu kacang, lontong, dan sambal kecap', price: '55000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=900&q=85', tag: 'Pilihan Chef', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MILD' },
  { id: '15', name: 'Bebek Madura Sambal Hitam', description: 'Bebek ungkep goreng dengan bumbu hitam khas Madura dan nasi putih', price: '58000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=85', tag: 'Pedas', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT' },
  { id: '16', name: 'Nasi Liwet Sunda', description: 'Nasi gurih, ayam suwir, tahu, lalapan, dan sambal terasi', price: '46000', category: 'Makanan Utama', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85', tag: 'Baru', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '17', name: 'Ikan Bakar Jimbaran', description: 'Ikan segar bakar arang dengan sambal matah dan plecing kangkung', price: '75000', category: 'Dari Laut', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85', tag: 'Pilihan Chef', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT', isSpecial: true },
  { id: '18', name: 'Pepes Ikan Kemangi', description: 'Ikan berbumbu rempah, tomat, dan kemangi yang dikukus dalam daun pisang', price: '48000', category: 'Dari Laut', image: 'https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=900&q=85', tag: 'Segar', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '19', name: 'Udang Balado', description: 'Udang besar tumis sambal balado, tomat, dan jeruk limau', price: '62000', category: 'Dari Laut', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=900&q=85', tag: 'Pedas', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT' },
  { id: '20', name: 'Cumi Sambal Hijau', description: 'Cumi segar dengan sambal cabai hijau, bawang, dan daun jeruk', price: '65000', category: 'Dari Laut', image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=900&q=85', tag: 'Pedas', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT' },
  { id: '21', name: 'Pindang Patin Palembang', description: 'Ikan patin dalam kuah asam pedas dengan nanas dan kemangi', price: '50000', category: 'Dari Laut', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'MEDIUM' },
  { id: '22', name: 'Kepiting Saus Padang', description: 'Kepiting segar dengan saus Padang, cabai, jahe, dan rempah', price: '98000', category: 'Dari Laut', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85', tag: 'Pilihan Chef', halalStatus: 'HALAL_INGREDIENTS', spiceLevel: 'HOT' },
  { id: '23', name: 'Es Teh Manis', description: 'Teh melati dingin dengan gula batu, sederhana dan menyegarkan', price: '15000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85', tag: 'Favorit', dietaryTags: ['VEGAN', 'NON_ALCOHOLIC'] },
  { id: '24', name: 'Es Jeruk Peras', description: 'Jeruk peras segar, es batu, dan sedikit gula', price: '18000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=900&q=85', tag: 'Segar', dietaryTags: ['VEGAN', 'NON_ALCOHOLIC'] },
  { id: '25', name: 'Es Cendol Dawet', description: 'Cendol pandan, santan, gula jawa, dan nangka', price: '22000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', dietaryTags: ['VEGETARIAN', 'NON_ALCOHOLIC'] },
  { id: '26', name: 'Bajigur', description: 'Minuman hangat santan, gula aren, jahe, dan sedikit kayu manis', price: '20000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', dietaryTags: ['VEGETARIAN', 'NON_ALCOHOLIC'] },
  { id: '27', name: 'Wedang Jahe', description: 'Seduhan jahe merah, serai, jeruk nipis, dan gula aren', price: '18000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=85', tag: 'Segar', dietaryTags: ['VEGAN', 'NON_ALCOHOLIC'] },
  { id: '28', name: 'Jus Alpukat Gula Aren', description: 'Alpukat lembut diblender dengan susu dan gula aren', price: '28000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=900&q=85', tag: 'Baru', dietaryTags: ['VEGETARIAN', 'NON_ALCOHOLIC'] },
  { id: '29', name: 'Es Doger', description: 'Es serut, santan, tape singkong, alpukat, dan sirup merah khas Bandung', price: '24000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85', tag: 'Tradisional', dietaryTags: ['VEGETARIAN', 'NON_ALCOHOLIC'] },
  { id: '30', name: 'Es Selendang Mayang', description: 'Kue kanji warna-warni, santan, dan kuah gula jawa yang dingin menyegarkan', price: '22000', category: 'Minuman', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85', tag: 'Baru', dietaryTags: ['VEGAN', 'NON_ALCOHOLIC'] },
]

export const restaurants: Record<string, Restaurant> = {
  'demo': { id: 'demo', slug: 'demo', name: 'Warung Nusantara', description: 'Masakan Indonesia dari dapur ke meja — resep rumahan, rempah pilihan, dan bahan segar setiap hari.', address: 'Jl. Senopati No. 14, Jakarta Selatan', hours: 'Buka hari ini · sampai 22:30', accent: 'salt', items: menuItems, story: 'Hidangan Nusantara yang akrab dengan sentuhan hangat untuk makan bersama.', phone: '021 4567 8901', instagram: 'warungnusantara', hoursDetail: 'Sen–Kam 11–22 · Jum–Sab 11–22:30 · Min 12–21', promo: { title: 'Paket Berdua — Rp95.000', description: '2 makanan utama + 2 minuman, setiap hari minggu ini.', badge: 'Minggu ini', validUntil: 'Sampai Minggu', type: 'package' }, currency: 'IDR', banner: { type: 'none' } },
  'restaurant-1': { id: 'restaurant-1', slug: 'restaurant-1', name: 'Warung Nusantara', description: 'Cita rasa Nusantara dari dapur ke meja — resep warisan, bahan segar pasar.', address: 'Jl. Senopati No. 14, Jakarta Selatan', hours: 'Buka hari ini · sampai 22:30', accent: 'salt', items: menuItems, story: 'Didirikan 2019 — kami memasak apa yang dibawa pasar pagi, dengan api kayu dan rempah pilihan.', phone: '021 4567 8901', instagram: 'warungnusantara', hoursDetail: 'Sen–Kam 11–22 · Jum–Sab 11–22:30 · Min 12–21', promo: { title: 'Paket Berdua — Rp95.000', description: '2 makanan utama + 2 minuman, setiap hari minggu ini.', badge: 'Minggu ini', validUntil: 'Sampai Minggu', type: 'package' }, currency: 'IDR', banner: { type: 'promo', promo: { title: 'Paket Berdua — Rp95.000', description: '2 makanan utama + 2 minuman, setiap hari minggu ini.', badge: 'Minggu ini', validUntil: 'Sampai Minggu', type: 'package' }, dismissible: true } },
  'restaurant-2': { id: 'restaurant-2', slug: 'restaurant-2', name: 'Kedai Pesisir', description: 'Hidangan laut segar, santan gurih, dan angin Bali di setiap suapan.', address: 'Jl. Pantai Berawa No. 8, Canggu, Bali', hours: 'Buka hari ini · sampai 22:00', accent: 'alba', items: menuItems.map((item, index) => ({ ...item, id: `pesisir-${item.id}`, name: index === 0 ? 'Udang Bakar Sambal Matah' : index === 1 ? 'Pelecing Kangkung' : item.name, category: index < 2 ? 'Dari Laut' : item.category })), story: 'Hidangan laut segar langsung dari pesisir — bakar arang, sambal matah, dan kelapa.', phone: '0361 234 5678', instagram: 'kedaipesisir.bali', hoursDetail: 'Sel–Min 12–22 · Tutup Senin', promo: { title: 'Beli 2 Gratis 1', description: 'Untuk semua makanan pembuka — campur & cocokkan.', badge: 'Promo', validUntil: 'Sepanjang bulan', type: 'bogo' }, currency: 'IDR', banner: { type: 'none', dismissible: true } },
}
