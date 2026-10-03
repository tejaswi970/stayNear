-- Run once in the Supabase SQL Editor for an existing database.
ALTER TABLE pg_listings
  ADD COLUMN IF NOT EXISTS verification_status TEXT;

UPDATE pg_listings
SET verification_status = CASE
  WHEN verified IS TRUE THEN 'verified'
  ELSE 'pending'
END
WHERE verification_status IS NULL;

ALTER TABLE pg_listings
  ALTER COLUMN verification_status SET DEFAULT 'pending',
  ALTER COLUMN verification_status SET NOT NULL;

ALTER TABLE pg_listings
  DROP CONSTRAINT IF EXISTS pg_listings_verification_status_check;

ALTER TABLE pg_listings
  ADD CONSTRAINT pg_listings_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'rejected'));

UPDATE pg_listings
SET verified = (verification_status = 'verified');

CREATE INDEX IF NOT EXISTS idx_pg_listings_verification_status
  ON pg_listings(verification_status);

NOTIFY pgrst, 'reload schema';