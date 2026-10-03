-- Read-only schema verification. Run after the migrations in README.md.
-- A missing column appears as MISSING; no application rows are read.
WITH required_columns(table_name, column_name) AS (
  VALUES
    ('users', 'id'), ('users', 'name'), ('users', 'email'), ('users', 'password_hash'), ('users', 'role'), ('users', 'phone'), ('users', 'is_demo'), ('users', 'created_at'),
    ('pg_listings', 'id'), ('pg_listings', 'owner_id'), ('pg_listings', 'name'), ('pg_listings', 'location'), ('pg_listings', 'address'), ('pg_listings', 'rent'), ('pg_listings', 'deposit'), ('pg_listings', 'maintenance'), ('pg_listings', 'electricity'), ('pg_listings', 'food_cost'), ('pg_listings', 'room_type'), ('pg_listings', 'amenities'), ('pg_listings', 'images'), ('pg_listings', 'upi_qr_path'), ('pg_listings', 'availability'), ('pg_listings', 'verified'), ('pg_listings', 'verification_status'), ('pg_listings', 'is_demo'), ('pg_listings', 'created_at'), ('pg_listings', 'updated_at'),
    ('rooms', 'id'), ('rooms', 'pg_id'), ('rooms', 'room_number'), ('rooms', 'room_type'), ('rooms', 'monthly_rent_inr'), ('rooms', 'deposit_inr'), ('rooms', 'status'), ('rooms', 'images'), ('rooms', 'created_at'), ('rooms', 'updated_at'),
    ('favorites', 'id'), ('favorites', 'user_id'), ('favorites', 'pg_id'), ('favorites', 'created_at'),
    ('reports', 'id'), ('reports', 'user_id'), ('reports', 'pg_id'), ('reports', 'reason'), ('reports', 'description'), ('reports', 'status'), ('reports', 'created_at'), ('reports', 'resolved_at'),
    ('room_requests', 'id'), ('room_requests', 'user_id'), ('room_requests', 'owner_id'), ('room_requests', 'pg_id'), ('room_requests', 'room_id'), ('room_requests', 'move_in_date'), ('room_requests', 'people_count'), ('room_requests', 'rooms_count'), ('room_requests', 'allocated_room_ids'), ('room_requests', 'message'), ('room_requests', 'status'), ('room_requests', 'expires_at'), ('room_requests', 'created_at'), ('room_requests', 'updated_at'),
    ('bookings', 'id'), ('bookings', 'request_id'), ('bookings', 'user_id'), ('bookings', 'owner_id'), ('bookings', 'pg_id'), ('bookings', 'room_id'), ('bookings', 'status'), ('bookings', 'confirmed_at'), ('bookings', 'created_at'),
    ('room_request_messages', 'id'), ('room_request_messages', 'request_id'), ('room_request_messages', 'sender_id'), ('room_request_messages', 'content'), ('room_request_messages', 'created_at'),
    ('booking_payment_proofs', 'id'), ('booking_payment_proofs', 'request_id'), ('booking_payment_proofs', 'user_id'), ('booking_payment_proofs', 'owner_id'), ('booking_payment_proofs', 'amount_inr'), ('booking_payment_proofs', 'storage_path'), ('booking_payment_proofs', 'status'), ('booking_payment_proofs', 'created_at'), ('booking_payment_proofs', 'reviewed_at'),
    ('ai_conversations', 'id'), ('ai_conversations', 'user_id'), ('ai_conversations', 'title'), ('ai_conversations', 'created_at'), ('ai_conversations', 'updated_at'),
    ('ai_chat_messages', 'id'), ('ai_chat_messages', 'conversation_id'), ('ai_chat_messages', 'user_id'), ('ai_chat_messages', 'sequence'), ('ai_chat_messages', 'role'), ('ai_chat_messages', 'content'), ('ai_chat_messages', 'pgs'), ('ai_chat_messages', 'created_at')
)
SELECT required.table_name,
       required.column_name,
       CASE WHEN actual.column_name IS NULL THEN 'MISSING' ELSE 'FOUND' END AS status,
       actual.data_type,
       actual.is_nullable
FROM required_columns AS required
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = 'public'
 AND actual.table_name = required.table_name
 AND actual.column_name = required.column_name
ORDER BY required.table_name, required.column_name;

-- Inspect primary keys, unique constraints, foreign keys, and checks.
SELECT constraint_table.relname AS table_name,
       constraint_row.conname AS constraint_name,
       constraint_row.contype AS constraint_type,
       pg_get_constraintdef(constraint_row.oid) AS definition
FROM pg_constraint AS constraint_row
JOIN pg_class AS constraint_table ON constraint_table.oid = constraint_row.conrelid
JOIN pg_namespace AS schema_row ON schema_row.oid = constraint_table.relnamespace
WHERE schema_row.nspname = 'public'
  AND constraint_table.relname IN ('users', 'pg_listings', 'rooms', 'favorites', 'reports', 'room_requests', 'bookings', 'room_request_messages', 'booking_payment_proofs', 'ai_conversations', 'ai_chat_messages')
ORDER BY table_name, constraint_type, constraint_name;

-- Check the two partial unique indexes that prevent competing room bookings.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_one_active_request_per_room', 'idx_room_one_confirmed_booking')
ORDER BY indexname;

-- Payment proof files must remain in a private bucket.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('pg-images', 'booking-payment-files')
ORDER BY id;
