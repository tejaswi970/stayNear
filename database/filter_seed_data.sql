-- Mark only the fixed development accounts/listings from seed.sql as demo data.
-- Rows are preserved; the application excludes demo rows from real workflows.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.pg_listings') IS NULL THEN
    RAISE EXCEPTION 'Expected public.users and public.pg_listings before marking seed data.';
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.pg_listings
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.users
SET is_demo = TRUE
WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001'
);

UPDATE public.pg_listings
SET is_demo = TRUE
WHERE id IN (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007',
  'd0000000-0000-0000-0000-000000000008'
);

NOTIFY pgrst, 'reload schema';
