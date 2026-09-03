CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  audience TEXT NOT NULL CHECK(audience IN ('waitlist','users','all')),
  tags TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('draft','sending','sent','failed')),
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES user(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_category_idx ON campaigns(category);
CREATE INDEX IF NOT EXISTS campaigns_audience_idx ON campaigns(audience);
