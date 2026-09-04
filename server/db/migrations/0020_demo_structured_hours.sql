-- Keep the built-in demo compatible with opening and closing time inputs.
UPDATE restaurants
SET hours = '11:00 - 22:00'
WHERE slug = 'demo'
  AND hours = 'Buka hari ini · sampai 22:30';
