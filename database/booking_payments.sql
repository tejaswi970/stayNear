-- Optional UPI QR and transaction-proof storage for confirmed room bookings.
-- Run after schema.sql and room_booking.sql. This preserves existing rows.
DO $$
BEGIN
  IF to_regclass('public.pg_listings') IS NULL
     OR to_regclass('public.room_requests') IS NULL THEN
    RAISE EXCEPTION 'Run schema.sql and room_booking.sql before booking_payments.sql.';
  END IF;
END $$;

ALTER TABLE public.pg_listings
  ADD COLUMN IF NOT EXISTS upi_qr_path TEXT;

CREATE TABLE IF NOT EXISTS public.booking_payment_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.room_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_inr NUMERIC(10,2) NOT NULL CHECK (amount_inr > 0),
  storage_path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_booking_payment_proofs_request
  ON public.booking_payment_proofs(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_payment_proofs_owner_status
  ON public.booking_payment_proofs(owner_id, status, created_at DESC);

ALTER TABLE public.booking_payment_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_payment_proofs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.booking_payment_proofs TO service_role;

NOTIFY pgrst, 'reload schema';
