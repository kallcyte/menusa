-- Superadmin role. Default 'user'; superadmins manage waitlist, users, and all restaurants.
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'superadmin'));
CREATE INDEX IF NOT EXISTS user_role_idx ON user(role);
