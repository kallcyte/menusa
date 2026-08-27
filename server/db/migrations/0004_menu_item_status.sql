ALTER TABLE menu_items ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT';

UPDATE menu_items SET status = 'ARCHIVED' WHERE archived = 1;
UPDATE menu_items SET status = 'PUBLISHED' WHERE archived = 0;

CREATE INDEX IF NOT EXISTS menu_items_status_idx ON menu_items(restaurant_id, status, sort_order);
