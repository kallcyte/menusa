CREATE TABLE IF NOT EXISTS promos (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  badge TEXT,
  type TEXT NOT NULL CHECK(type IN ('percentage','fixed','bogo','bundle','free_shipping','custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','scheduled','expired','archived')),
  valid_from TEXT,
  valid_until TEXT,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  min_purchase REAL,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK(applies_to IN ('all','categories','items')),
  applies_ids TEXT NOT NULL DEFAULT '[]',
  stackable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS promos_restaurant_idx ON promos(restaurant_id, status, valid_until);
CREATE INDEX IF NOT EXISTS promos_restaurant_status_idx ON promos(restaurant_id, status);

CREATE TABLE IF NOT EXISTS promo_rules (
  id TEXT PRIMARY KEY,
  promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('buy_x_get_y','min_qty','min_amount','time_window','first_order')),
  config TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS promo_rules_promo_idx ON promo_rules(promo_id);
