-- StayNear Seed Data
-- Run AFTER schema.sql
-- Admin password: Admin@123 (bcrypt hash below)
-- Owner password: Owner@123
-- Tenant password: Tenant@123

-- Admin user (not publicly registerable)
INSERT INTO users (id, name, email, password_hash, role, is_demo) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'StayNear Admin',
  'admin@staynear.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin', TRUE
);

-- Sample owners
INSERT INTO users (id, name, email, password_hash, role, is_demo) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'Ramesh Kumar',
  'ramesh@example.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'owner', TRUE
),
(
  'b0000000-0000-0000-0000-000000000002',
  'Priya Sharma',
  'priya@example.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'owner', TRUE
),
(
  'b0000000-0000-0000-0000-000000000003',
  'Suresh Nair',
  'suresh@example.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'owner', TRUE
);

-- Sample tenant
INSERT INTO users (id, name, email, password_hash, role, is_demo) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'Ankit Verma',
  'ankit@example.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'tenant', TRUE
);

-- Sample PG Listings
INSERT INTO pg_listings (id, owner_id, name, description, location, address, rent, deposit, maintenance, electricity, food_cost, room_type, amenities, images, availability, verified, is_demo) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Sunrise PG',
  'A comfortable and well-maintained PG near the city center. Clean rooms, hygienic food, and a friendly environment for students and working professionals.',
  'Koramangala, Bangalore',
  '12, 4th Cross, Koramangala 5th Block, Bangalore - 560095',
  6500, 13000, 300, 500, 1500,
  'single',
  '{"wifi": true, "food": true, "parking": false, "laundry": true, "ac": false, "attached_bathroom": false, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'],
  'available', true, true
),
(
  'd0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  'Green Residency',
  'Spacious 2-sharing rooms with all modern amenities. Located close to IT parks and metro station.',
  'HSR Layout, Bangalore',
  '45, 27th Main, HSR Layout Sector 1, Bangalore - 560102',
  5500, 11000, 250, 400, NULL,
  '2-sharing',
  '{"wifi": true, "food": false, "parking": true, "laundry": true, "ac": false, "attached_bathroom": true, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
  'available', true, true
),
(
  'd0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000002',
  'Sri Comfort PG',
  'Budget-friendly PG with home-cooked food. Best for students studying in nearby colleges.',
  'Indiranagar, Bangalore',
  '8, CMH Road, Indiranagar, Bangalore - 560038',
  7000, 14000, 350, 600, 2000,
  'single',
  '{"wifi": true, "food": true, "parking": false, "laundry": false, "ac": true, "attached_bathroom": true, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'],
  'available', true, true
),
(
  'd0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000002',
  'City View Hostel',
  'Modern hostel with excellent facilities. Rooftop terrace and common areas for socializing.',
  'MG Road, Bangalore',
  '34, Brigade Road, MG Road Area, Bangalore - 560001',
  4500, 9000, 200, 300, NULL,
  '4-sharing',
  '{"wifi": true, "food": false, "parking": false, "laundry": true, "ac": false, "attached_bathroom": false, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800'],
  'few_rooms', false, true
),
(
  'd0000000-0000-0000-0000-000000000005',
  'b0000000-0000-0000-0000-000000000003',
  'Lakeview PG',
  'Premium PG with AC rooms near Ulsoor Lake. Walking distance to major tech parks.',
  'Ulsoor, Bangalore',
  '17, Ulsoor Lake Road, Ulsoor, Bangalore - 560042',
  9500, 19000, 500, 800, 2500,
  'single',
  '{"wifi": true, "food": true, "parking": true, "laundry": true, "ac": true, "attached_bathroom": true, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'],
  'available', true, true
),
(
  'd0000000-0000-0000-0000-000000000006',
  'b0000000-0000-0000-0000-000000000003',
  'Budget Stay PG',
  'Affordable accommodation for students. Basic amenities, clean and safe.',
  'Marathahalli, Bangalore',
  '23, Outer Ring Road, Marathahalli, Bangalore - 560037',
  3500, 7000, 150, 250, 1200,
  '3-sharing',
  '{"wifi": false, "food": true, "parking": false, "laundry": false, "ac": false, "attached_bathroom": false, "furnished": false}',
  ARRAY['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800'],
  'full', false, true
),
(
  'd0000000-0000-0000-0000-000000000007',
  'b0000000-0000-0000-0000-000000000001',
  'Tech Hub PG',
  'Perfect for IT professionals. High-speed WiFi, 24x7 security, and close to major tech corridors.',
  'Electronic City, Bangalore',
  '56, Phase 1, Electronic City, Bangalore - 560100',
  6000, 12000, 300, 450, NULL,
  '2-sharing',
  '{"wifi": true, "food": false, "parking": true, "laundry": true, "ac": false, "attached_bathroom": true, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
  'available', true, true
),
(
  'd0000000-0000-0000-0000-000000000008',
  'b0000000-0000-0000-0000-000000000002',
  'Harmony Residency',
  'Women-only PG with strict security. Homely atmosphere with nutritious meals.',
  'Jayanagar, Bangalore',
  '9, 4th T Block, Jayanagar, Bangalore - 560041',
  7500, 15000, 400, 550, 1800,
  'single',
  '{"wifi": true, "food": true, "parking": false, "laundry": true, "ac": true, "attached_bathroom": true, "furnished": true}',
  ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'],
  'available', true, true
);
