-- Run in the Supabase SQL Editor for an existing StayNear database.
-- This is additive and preserves all existing users and constraints.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Expected existing table public.users was not found; no schema was changed.';
  END IF;
END $$;

-- Inspect the live columns and constraints before applying the change.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY constraint_type, constraint_name;

-- Registration accepts phone as optional; bookings use it as contact detail.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Refresh PostgREST so the API sees the updated table definition.
NOTIFY pgrst, 'reload schema';

-- Confirm the expected column now exists.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone';
