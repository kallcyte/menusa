-- Normalize legacy empty currency values to the platform default.
UPDATE restaurants
SET currency = 'IDR'
WHERE currency IS NULL OR TRIM(currency) = '';
