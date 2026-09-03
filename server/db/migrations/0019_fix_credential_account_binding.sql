-- Better Auth resolves credential accounts by issuer + user ID.
-- Repair accounts created by the superadmin path before it used user IDs.
UPDATE account
SET accountId = userId
WHERE providerId = 'credential' AND accountId != userId;
