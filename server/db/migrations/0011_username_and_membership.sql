-- Username + multi-restaurant membership (junction). Keep restaurants.owner_id as primary owner for backwards compat.
ALTER TABLE user ADD COLUMN username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS user_username_idx ON user(username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS restaurant_members (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'manager', 'staff')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, user_id)
);
CREATE INDEX IF NOT EXISTS restaurant_members_user_idx ON restaurant_members(user_id);
CREATE INDEX IF NOT EXISTS restaurant_members_restaurant_idx ON restaurant_members(restaurant_id);
