-- StayNear Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('tenant', 'owner', 'admin');
CREATE TYPE room_type AS ENUM ('single', '2-sharing', '3-sharing', '4-sharing');
CREATE TYPE availability_status AS ENUM ('available', 'few_rooms', 'full');
CREATE TYPE report_reason AS ENUM (
  'wrong_rent',
  'wrong_location',
  'fake_listing',
  'occupied_pg',
  'incorrect_facilities',
  'suspicious_listing',
  'other'
);
CREATE TYPE report_status AS ENUM ('open', 'resolved');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'tenant',
  phone TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PG Listings table
CREATE TABLE IF NOT EXISTS pg_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  rent NUMERIC(10,2) NOT NULL,
  deposit NUMERIC(10,2),
  maintenance NUMERIC(10,2),
  electricity NUMERIC(10,2),
  food_cost NUMERIC(10,2),
  room_type room_type NOT NULL,
  amenities JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  availability availability_status NOT NULL DEFAULT 'available',
  verified BOOLEAN DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pg_id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE,
  reason report_reason NOT NULL,
  description TEXT,
  status report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- StayBot conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- StayBot chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  pgs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pg_listings_location ON pg_listings(location);
CREATE INDEX IF NOT EXISTS idx_pg_listings_rent ON pg_listings(rent);
CREATE INDEX IF NOT EXISTS idx_pg_listings_room_type ON pg_listings(room_type);
CREATE INDEX IF NOT EXISTS idx_pg_listings_availability ON pg_listings(availability);
CREATE INDEX IF NOT EXISTS idx_pg_listings_verified ON pg_listings(verified);
CREATE INDEX IF NOT EXISTS idx_pg_listings_owner_id ON pg_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_pg_listings_updated_at ON pg_listings(updated_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_pg_id ON reports(pg_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated ON ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_sequence ON ai_chat_messages(user_id, sequence DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pg_listings_updated_at
  BEFORE UPDATE ON pg_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
