-- Each ALTER must be its own statement — SQLite allows one ADD COLUMN per ALTER.
ALTER TABLE restaurants ADD COLUMN banner_type TEXT DEFAULT 'none';
ALTER TABLE restaurants ADD COLUMN banner_promo_id TEXT REFERENCES promos(id) ON DELETE SET NULL;
ALTER TABLE restaurants ADD COLUMN banner_announcement TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN banner_dismissible INTEGER DEFAULT 1;
ALTER TABLE restaurants ADD COLUMN currency TEXT DEFAULT 'IDR';
