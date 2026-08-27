CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  restaurant_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist(email);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist(created_at DESC);
