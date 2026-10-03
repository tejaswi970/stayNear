-- Room inventory, requests, and bookings. Run after schema.sql.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  monthly_rent_inr NUMERIC(10,2) NOT NULL CHECK (monthly_rent_inr >= 0),
  deposit_inr NUMERIC(10,2) CHECK (deposit_inr IS NULL OR deposit_inr >= 0),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','requested','reserved','booked','sold','maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pg_id, room_number)
);
CREATE INDEX IF NOT EXISTS idx_rooms_pg_status ON rooms(pg_id, status);
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION sync_pg_room_availability()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target_pg UUID; total_rooms INTEGER; available_rooms INTEGER;
BEGIN
  target_pg := CASE WHEN TG_OP = 'DELETE' THEN OLD.pg_id ELSE NEW.pg_id END;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'available')
  INTO total_rooms, available_rooms FROM rooms WHERE pg_id = target_pg;
  UPDATE pg_listings SET availability = CASE
    WHEN total_rooms = 0 OR available_rooms = 0 THEN 'full'::availability_status
    WHEN available_rooms <= 2 THEN 'few_rooms'::availability_status
    ELSE 'available'::availability_status END
  WHERE id = target_pg;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sync_pg_room_availability ON rooms;
CREATE TRIGGER sync_pg_room_availability AFTER INSERT OR UPDATE OR DELETE ON rooms
  FOR EACH ROW EXECUTE FUNCTION sync_pg_room_availability();

-- Reconcile listings with existing room inventory when this script is applied.
UPDATE pg_listings AS pg SET availability = CASE
  WHEN inventory.available = 0 THEN 'full'::availability_status
  WHEN inventory.available <= 2 THEN 'few_rooms'::availability_status
  ELSE 'available'::availability_status END
FROM (
  SELECT pg_id, COUNT(*) FILTER (WHERE status = 'available') AS available
  FROM rooms GROUP BY pg_id
) AS inventory
WHERE pg.id = inventory.pg_id;

CREATE TABLE IF NOT EXISTS room_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  move_in_date DATE NOT NULL,
  people_count INTEGER NOT NULL DEFAULT 1 CHECK (people_count > 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','owner_accepted','owner_rejected','user_accepted','user_rejected','confirmed','cancelled','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_request_per_room ON room_requests(room_id)
  WHERE status IN ('pending','owner_accepted','user_accepted');
CREATE INDEX IF NOT EXISTS idx_room_requests_user ON room_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_requests_owner ON room_requests(owner_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL UNIQUE REFERENCES room_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_one_confirmed_booking ON bookings(room_id) WHERE status = 'confirmed';

CREATE TABLE IF NOT EXISTS room_request_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES room_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_request_messages_request ON room_request_messages(request_id, created_at);
-- All room and booking data is accessed through the authenticated backend.
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_request_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rooms, room_requests, bookings, room_request_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON rooms, room_requests, bookings, room_request_messages TO service_role;

CREATE OR REPLACE FUNCTION create_room_request(p_user_id UUID, p_room_id UUID, p_move_in_date DATE, p_people_count INTEGER, p_message TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE room_row rooms%ROWTYPE; owner_user UUID; request_id UUID;
BEGIN
  SELECT * INTO room_row FROM rooms WHERE id=p_room_id FOR UPDATE;
  IF NOT FOUND OR room_row.status <> 'available' THEN RAISE EXCEPTION 'This room is no longer available'; END IF;
  SELECT owner_id INTO owner_user FROM pg_listings WHERE id=room_row.pg_id;
  IF owner_user IS NULL THEN RAISE EXCEPTION 'PG listing not found'; END IF;
  IF EXISTS (SELECT 1 FROM room_requests WHERE user_id=p_user_id AND room_id=p_room_id AND status IN ('pending','owner_accepted','user_accepted')) THEN
    RAISE EXCEPTION 'You already have an active request for this room';
  END IF;
  UPDATE rooms SET status='requested',updated_at=NOW() WHERE id=p_room_id AND status='available';
  IF NOT FOUND THEN RAISE EXCEPTION 'This room is no longer available'; END IF;
  INSERT INTO room_requests(user_id,owner_id,pg_id,room_id,move_in_date,people_count,message)
  VALUES(p_user_id,owner_user,room_row.pg_id,p_room_id,p_move_in_date,p_people_count,p_message) RETURNING id INTO request_id;
  RETURN request_id;
END; $$;

CREATE OR REPLACE FUNCTION transition_room_request(p_request_id UUID, p_actor_id UUID, p_action TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE request_row room_requests%ROWTYPE; room_row rooms%ROWTYPE; booking_id UUID;
BEGIN
  SELECT * INTO request_row FROM room_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT * INTO room_row FROM rooms WHERE id=request_row.room_id FOR UPDATE;
  IF request_row.status='owner_accepted' AND request_row.expires_at<=NOW() THEN
    UPDATE room_requests SET status='expired',updated_at=NOW() WHERE id=p_request_id;
    UPDATE rooms SET status='available',updated_at=NOW() WHERE id=room_row.id AND status='requested';
    RETURN jsonb_build_object('request_id',p_request_id,'status','expired');
  END IF;
  IF p_action IN ('owner_accept','owner_reject') AND request_row.owner_id <> p_actor_id THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF p_action IN ('user_confirm','user_reject','cancel_booking') AND request_row.user_id <> p_actor_id THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF p_action='owner_accept' AND request_row.status='pending' AND room_row.status='requested' THEN
    UPDATE room_requests SET status='confirmed',updated_at=NOW() WHERE id=p_request_id;
    UPDATE rooms SET status='booked',updated_at=NOW() WHERE id=room_row.id AND status='requested';
    IF NOT FOUND THEN RAISE EXCEPTION 'This room is no longer available.'; END IF;
    INSERT INTO bookings(request_id,user_id,owner_id,pg_id,room_id)
      VALUES(p_request_id,request_row.user_id,request_row.owner_id,request_row.pg_id,request_row.room_id)
      RETURNING id INTO booking_id;
  ELSIF p_action='owner_reject' AND request_row.status='pending' THEN
    UPDATE room_requests SET status='owner_rejected',updated_at=NOW() WHERE id=p_request_id;
    UPDATE rooms SET status='available',updated_at=NOW() WHERE id=room_row.id AND status='requested';
  ELSIF p_action='user_confirm' AND request_row.status='owner_accepted' AND request_row.expires_at>NOW() AND room_row.status='requested' THEN
    UPDATE room_requests SET status='confirmed',updated_at=NOW() WHERE id=p_request_id;
    UPDATE rooms SET status='booked',updated_at=NOW() WHERE id=room_row.id AND status='requested';
    IF NOT FOUND THEN RAISE EXCEPTION 'Sorry, this room has just been booked by another user.'; END IF;
    INSERT INTO bookings(request_id,user_id,owner_id,pg_id,room_id) VALUES(p_request_id,request_row.user_id,request_row.owner_id,request_row.pg_id,request_row.room_id) RETURNING id INTO booking_id;
  ELSIF p_action='user_reject' AND request_row.status='owner_accepted' THEN
    UPDATE room_requests SET status='user_rejected',updated_at=NOW() WHERE id=p_request_id;
    UPDATE rooms SET status='available',updated_at=NOW() WHERE id=room_row.id AND status='requested';
  ELSIF p_action='cancel_booking' AND request_row.status='confirmed' THEN
    UPDATE room_requests SET status='cancelled',updated_at=NOW() WHERE id=p_request_id;
    UPDATE bookings SET status='cancelled' WHERE request_id=p_request_id AND status='confirmed';
    UPDATE rooms SET status='available',updated_at=NOW() WHERE id=room_row.id AND status='booked';
  ELSE RAISE EXCEPTION 'Request action is not allowed for its current status';
  END IF;
  RETURN jsonb_build_object('request_id',p_request_id,'status',(SELECT status FROM room_requests WHERE id=p_request_id));
END; $$;

CREATE OR REPLACE FUNCTION refresh_expired_room_requests()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE expired_row RECORD; total INTEGER := 0;
BEGIN
  FOR expired_row IN UPDATE room_requests SET status='expired',updated_at=NOW()
    WHERE status='owner_accepted' AND expires_at<=NOW() RETURNING room_id LOOP
    UPDATE rooms SET status='available',updated_at=NOW() WHERE id=expired_row.room_id AND status='requested';
    total := total + 1;
  END LOOP;
  RETURN total;
END; $$;

REVOKE EXECUTE ON FUNCTION create_room_request(UUID, UUID, DATE, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION transition_room_request(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refresh_expired_room_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_room_request(UUID, UUID, DATE, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION transition_room_request(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION refresh_expired_room_requests() TO service_role;

NOTIFY pgrst, 'reload schema';
