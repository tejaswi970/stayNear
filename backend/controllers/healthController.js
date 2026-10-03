const supabase = require('../config/supabase');

const REQUIRED_TABLES = {
  users: 'id,name,email,password_hash,role,phone,is_demo,created_at',
  pg_listings: 'id,owner_id,name,description,location,address,rent,deposit,maintenance,electricity,food_cost,room_type,amenities,images,upi_qr_path,availability,verified,verification_status,is_demo,created_at,updated_at',
  rooms: 'id,pg_id,room_number,room_type,monthly_rent_inr,deposit_inr,status,images,created_at,updated_at',
  favorites: 'id,user_id,pg_id,created_at',
  reports: 'id,user_id,pg_id,reason,description,status,created_at,resolved_at',
  room_requests: 'id,user_id,owner_id,pg_id,room_id,move_in_date,people_count,rooms_count,allocated_room_ids,message,status,expires_at,created_at,updated_at',
  bookings: 'id,request_id,user_id,owner_id,pg_id,room_id,status,confirmed_at,created_at',
  room_request_messages: 'id,request_id,sender_id,content,created_at',
  booking_payment_proofs: 'id,request_id,user_id,owner_id,amount_inr,storage_path,status,created_at,reviewed_at',
  ai_conversations: 'id,user_id,title,created_at,updated_at',
  ai_chat_messages: 'id,conversation_id,user_id,sequence,role,content,pgs,created_at',
};

function migrationHint(table, error) {
  if (table === 'users' && ['42703', 'PGRST204'].includes(error.code)) {
    return 'The users table is missing a required column. Run database/add_users_phone.sql and database/filter_seed_data.sql.';
  }
  if (['rooms', 'room_requests', 'bookings', 'room_request_messages'].includes(table)
      && ['42P01', 'PGRST205'].includes(error.code)) {
    return 'Room and booking tables are missing. Run database/room_booking.sql.';
  }
  if (table === 'rooms' && ['42703', 'PGRST204'].includes(error.code)) {
    return 'Room photos are not enabled yet. Run database/room_photos.sql.';
  }
  if (table === 'room_requests' && ['42703', 'PGRST204'].includes(error.code)) {
    return 'Multiple room bookings are not enabled yet. Run database/room_quantities.sql.';
  }
  if (table === 'booking_payment_proofs' && ['42P01', 'PGRST205'].includes(error.code)) {
    return 'Booking payment proof storage is not set up. Run database/booking_payments.sql.';
  }
  if (table === 'pg_listings' && ['42703', 'PGRST204'].includes(error.code)) {
    return 'PG listings are missing a current application column. Run database/booking_payments.sql and database/filter_seed_data.sql.';
  }
  if (['ai_conversations', 'ai_chat_messages'].includes(table)
      && ['42P01', 'PGRST205'].includes(error.code)) {
    return 'StayBot history tables are missing. Run database/chat_history.sql.';
  }
  if (['42P01', 'PGRST205'].includes(error.code)) {
    return `The ${table} table is missing from the public API schema.`;
  }
  if (['42703', 'PGRST204'].includes(error.code)) {
    return `The ${table} table does not match the current application schema.`;
  }
  return `Could not verify ${table} (${error.code || 'database error'}).`;
}

exports.readiness = async (req, res) => {
  const checks = await Promise.all(Object.entries(REQUIRED_TABLES).map(async ([table, columns]) => {
    const { error } = await supabase.from(table).select(columns).limit(0);
    return error
      ? { resource: table, ready: false, message: migrationHint(table, error) }
      : { resource: table, ready: true };
  }));

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket('pg-images');
  checks.push(bucketError || !bucket
    ? { resource: 'pg-images', ready: false, message: 'The PG photo bucket is missing. Run database/storage.sql.' }
    : { resource: 'pg-images', ready: true });

  const { data: paymentBucket, error: paymentBucketError } = await supabase.storage.getBucket('booking-payment-files');
  checks.push(paymentBucketError || !paymentBucket || paymentBucket.public
    ? { resource: 'booking-payment-files', ready: false, message: 'Private payment file storage is missing or is public. Run database/storage.sql.' }
    : { resource: 'booking-payment-files', ready: true });

  const ready = checks.every(check => check.ready);
  res.status(ready ? 200 : 503).json({
    success: ready,
    ready,
    message: ready ? 'Database schema and photo storage are ready.' : 'StayNear database setup is incomplete.',
    checks,
  });
};
