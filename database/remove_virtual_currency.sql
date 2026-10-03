-- One-time cleanup for databases that previously installed the virtual currency feature.
-- Keep this limited to clearly coin-specific objects. This is additive to the rest
-- of the application and must not remove room-booking functions or general settings.
DROP FUNCTION IF EXISTS create_pg_with_listing_fee(UUID, JSONB, JSONB);
DROP TABLE IF EXISTS coin_transactions;
ALTER TABLE users DROP COLUMN IF EXISTS coin_balance;
NOTIFY pgrst, 'reload schema';
