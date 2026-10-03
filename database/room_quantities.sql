-- Reserve multiple physical rooms in one booking request.
-- Run after room_booking.sql. Existing requests stay as one-room requests.
ALTER TABLE public.room_requests
  ADD COLUMN IF NOT EXISTS rooms_count INTEGER NOT NULL DEFAULT 1 CHECK (rooms_count BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS allocated_room_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.create_room_request_with_quantity(
  p_user_id UUID,
  p_room_id UUID,
  p_move_in_date DATE,
  p_people_count INTEGER,
  p_message TEXT,
  p_room_count INTEGER
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_row public.rooms%ROWTYPE;
  owner_user UUID;
  request_id UUID;
  selected_room_ids UUID[];
  reserved_count INTEGER;
BEGIN
  IF p_room_count IS NULL OR p_room_count < 1 OR p_room_count > 500 THEN
    RAISE EXCEPTION 'Choose between 1 and 500 rooms.';
  END IF;
  SELECT * INTO room_row FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR room_row.status <> 'available' THEN
    RAISE EXCEPTION 'This room is no longer available.';
  END IF;
  SELECT owner_id INTO owner_user FROM public.pg_listings WHERE id = room_row.pg_id;
  IF owner_user IS NULL THEN RAISE EXCEPTION 'PG listing not found.'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.room_requests
    WHERE user_id = p_user_id AND room_id = p_room_id
      AND status IN ('pending', 'owner_accepted', 'user_accepted')
  ) THEN RAISE EXCEPTION 'You already have an active request for this room.'; END IF;

  WITH lockable AS MATERIALIZED (
    SELECT id, room_number FROM public.rooms
    WHERE pg_id = room_row.pg_id AND room_type = room_row.room_type
      AND monthly_rent_inr = room_row.monthly_rent_inr AND status = 'available'
    ORDER BY room_number, id
    FOR UPDATE
  )
  SELECT ARRAY(
    SELECT id FROM lockable
    ORDER BY (id = p_room_id) DESC, room_number, id
    LIMIT p_room_count
  ) INTO selected_room_ids;
  IF COALESCE(array_length(selected_room_ids, 1), 0) <> p_room_count THEN
    RAISE EXCEPTION 'Only % matching room(s) are currently available.', COALESCE(array_length(selected_room_ids, 1), 0);
  END IF;

  UPDATE public.rooms SET status = 'requested', updated_at = NOW()
  WHERE id = ANY(selected_room_ids) AND status = 'available';
  GET DIAGNOSTICS reserved_count = ROW_COUNT;
  IF reserved_count <> p_room_count THEN RAISE EXCEPTION 'Room availability changed. Refresh and try again.'; END IF;

  INSERT INTO public.room_requests(
    user_id, owner_id, pg_id, room_id, move_in_date, people_count, message, rooms_count, allocated_room_ids
  ) VALUES (
    p_user_id, owner_user, room_row.pg_id, p_room_id, p_move_in_date,
    GREATEST(1, COALESCE(p_people_count, 1)), LEFT(COALESCE(p_message, ''), 1000), p_room_count, selected_room_ids
  ) RETURNING id INTO request_id;
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_room_request(p_request_id UUID, p_actor_id UUID, p_action TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  request_row public.room_requests%ROWTYPE;
  room_row public.rooms%ROWTYPE;
  booking_id UUID;
  allocation UUID[];
  updated_count INTEGER;
BEGIN
  SELECT * INTO request_row FROM public.room_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  SELECT * INTO room_row FROM public.rooms WHERE id = request_row.room_id FOR UPDATE;
  allocation := COALESCE(NULLIF(request_row.allocated_room_ids, '{}'::uuid[]), ARRAY[request_row.room_id]);

  IF request_row.status = 'owner_accepted' AND request_row.expires_at <= NOW() THEN
    UPDATE public.room_requests SET status = 'expired', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.rooms SET status = 'available', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'requested';
    RETURN jsonb_build_object('request_id', p_request_id, 'status', 'expired');
  END IF;
  IF p_action IN ('owner_accept', 'owner_reject') AND request_row.owner_id <> p_actor_id THEN RAISE EXCEPTION 'Not your request.'; END IF;
  IF p_action IN ('user_confirm', 'user_reject', 'cancel_booking') AND request_row.user_id <> p_actor_id THEN RAISE EXCEPTION 'Not your request.'; END IF;

  IF p_action = 'owner_accept' AND request_row.status = 'pending' THEN
    UPDATE public.rooms SET status = 'booked', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'requested';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> COALESCE(request_row.rooms_count, 1) THEN RAISE EXCEPTION 'Some rooms are no longer held for this request.'; END IF;
    UPDATE public.room_requests SET status = 'confirmed', updated_at = NOW() WHERE id = p_request_id;
    INSERT INTO public.bookings(request_id, user_id, owner_id, pg_id, room_id)
      VALUES (p_request_id, request_row.user_id, request_row.owner_id, request_row.pg_id, request_row.room_id)
      RETURNING id INTO booking_id;
  ELSIF p_action = 'owner_reject' AND request_row.status = 'pending' THEN
    UPDATE public.room_requests SET status = 'owner_rejected', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.rooms SET status = 'available', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'requested';
  ELSIF p_action = 'user_confirm' AND request_row.status = 'owner_accepted' AND request_row.expires_at > NOW() THEN
    UPDATE public.rooms SET status = 'booked', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'requested';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> COALESCE(request_row.rooms_count, 1) THEN RAISE EXCEPTION 'Some rooms are no longer held for this request.'; END IF;
    UPDATE public.room_requests SET status = 'confirmed', updated_at = NOW() WHERE id = p_request_id;
    INSERT INTO public.bookings(request_id, user_id, owner_id, pg_id, room_id)
      VALUES (p_request_id, request_row.user_id, request_row.owner_id, request_row.pg_id, request_row.room_id)
      RETURNING id INTO booking_id;
  ELSIF p_action = 'user_reject' AND request_row.status = 'owner_accepted' THEN
    UPDATE public.room_requests SET status = 'user_rejected', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.rooms SET status = 'available', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'requested';
  ELSIF p_action = 'cancel_booking' AND request_row.status = 'confirmed' THEN
    UPDATE public.room_requests SET status = 'cancelled', updated_at = NOW() WHERE id = p_request_id;
    UPDATE public.bookings SET status = 'cancelled' WHERE request_id = p_request_id AND status = 'confirmed';
    UPDATE public.rooms SET status = 'available', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'booked';
  ELSE
    RAISE EXCEPTION 'Request action is not allowed for its current status.';
  END IF;
  RETURN jsonb_build_object('request_id', p_request_id, 'status', (SELECT status FROM public.room_requests WHERE id = p_request_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_expired_room_requests()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE expired_row RECORD; allocation UUID[]; total INTEGER := 0;
BEGIN
  FOR expired_row IN
    UPDATE public.room_requests SET status = 'expired', updated_at = NOW()
    WHERE status = 'owner_accepted' AND expires_at <= NOW()
    RETURNING room_id, allocated_room_ids
  LOOP
    allocation := COALESCE(NULLIF(expired_row.allocated_room_ids, '{}'::uuid[]), ARRAY[expired_row.room_id]);
    UPDATE public.rooms SET status = 'available', updated_at = NOW()
      WHERE id = ANY(allocation) AND status = 'requested';
    total := total + 1;
  END LOOP;
  RETURN total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_room_request_with_quantity(UUID, UUID, DATE, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_request_with_quantity(UUID, UUID, DATE, INTEGER, TEXT, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.transition_room_request(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_room_request(UUID, UUID, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.refresh_expired_room_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_expired_room_requests() TO service_role;

NOTIFY pgrst, 'reload schema';
