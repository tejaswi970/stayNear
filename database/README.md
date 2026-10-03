# StayNear Database

## Fresh Supabase project

1. Create a Supabase project and open its SQL Editor.
2. Run `schema.sql`.
3. Run `room_booking.sql` for rooms, requests, bookings, booking chat, and the owner-confirmation booking flow.
4. Run `room_photos.sql` and `room_quantities.sql` for optional room photos and multi-room booking requests.
5. Run `booking_payments.sql` for optional owner UPI QR codes and private booking receipt storage.
6. Run `storage.sql` to enable PG photo uploads and private payment files.
7. Run `secure_backend_tables.sql` to restrict database tables to the backend service role.
8. Run `filter_seed_data.sql` if you loaded development samples; it safely marks only fixed sample IDs in the database. The backend also excludes those IDs from real workflows, so applying this marker does not require deleting sample rows.
9. Run `verify_live_schema.sql`; all required columns should say `FOUND`.
10. Optionally run `seed.sql` for development sample accounts and listings. Do not run it in production.
11. After starting the backend, check `http://localhost:5000/api/ready`; it should return `ready: true`.

## Existing Supabase project

Do not run `schema.sql` or `seed.sql` on an existing project: `schema.sql` is for a fresh database, and `seed.sql` inserts development accounts and listings.

1. Optionally run `remove_virtual_currency.sql` once if the old virtual currency objects were installed. It removes only coin-specific objects and preserves room-booking functions and general settings.
2. Run `verification_status.sql` if listing verification columns are missing.
3. Run `add_users_phone.sql` in the Supabase SQL Editor to inspect `public.users`, add the optional `phone TEXT` column if missing, and reload the API schema cache. This migration preserves existing user data.
4. Apply the latest `room_booking.sql` to install room inventory, owner-confirmation booking, and confirmed-booking chat. It also safely ensures the phone column exists.
5. Run `room_photos.sql` and `room_quantities.sql` to enable optional room photos and multi-room booking requests.
6. Run `booking_payments.sql` for the optional UPI QR and transaction receipt feature.
7. Run `storage.sql` to create or update the PG photo and private booking payment buckets.
8. Run `chat_history.sql` if StayBot conversation tables are missing.
9. Run `filter_seed_data.sql` to mark only the fixed sample account/listing IDs used by `seed.sql`; rows are preserved, sample accounts are denied, and sample listings are excluded from real flows.
10. Run `secure_backend_tables.sql` to restrict database tables to the backend service role.
11. Run `verify_live_schema.sql`; all required columns should say `FOUND` and the booking indexes should be listed.
12. Restart the backend so it reconnects with the updated schema.
13. Check `http://localhost:5000/api/ready`; it should return `ready: true` before testing registration or booking.

Room chat is available only to the tenant and owner attached to a confirmed request. The service-role key is used by the backend for private database operations and photo uploads.

UPI QR codes are optional per PG. Tenants can view the QR and upload a receipt only after the owner confirms and books the room. The owner reviews the receipt manually; StayNear does not transfer or process money. The QR and receipts are stored in a private bucket and delivered with temporary signed links.

Admin accounts cannot be created through public registration.

## If the API still reports missing columns or tables after running SQL

1. Confirm the Supabase project selected in the SQL Editor matches the project host in `backend/.env` (`SUPABASE_URL`). Never paste or share the service-role key.
2. Check the SQL Editor output for an error; `add_users_phone.sql` should return a final row with `phone` and type `text`.
3. Run `verify_live_schema.sql` in that same project. It reports each expected column and the live key constraints/indexes without reading application data.
4. If SQL succeeds and the verifier is clean but the API remains stale, the migration sends `NOTIFY pgrst` to reload the REST schema cache; restart the backend and retry after the reload completes.
