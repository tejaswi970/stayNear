-- Restrict private StayNear tables to the backend service role.
-- The frontend talks to Express; it does not query Supabase directly.
-- This is idempotent, preserves rows, and skips room tables until their migration exists.
DO $$
DECLARE
  relation_name TEXT;
  relation_names TEXT[] := ARRAY[
    'users',
    'pg_listings',
    'favorites',
    'reports',
    'ai_conversations',
    'ai_chat_messages',
    'rooms',
    'room_requests',
    'bookings',
    'room_request_messages',
    'booking_payment_proofs'
  ];
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';

  FOREACH relation_name IN ARRAY relation_names LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', relation_name);
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', relation_name);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
