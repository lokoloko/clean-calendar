-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a simple auth schema for local development
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table for local development
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    raw_user_meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  ics_url TEXT NOT NULL,
  cleaning_fee DECIMAL(10,2) DEFAULT 0,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cleaners table
CREATE TABLE IF NOT EXISTS public.cleaners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, cleaner_id)
);

-- Create schedule items table
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE NOT NULL,
  booking_uid TEXT,
  guest_name TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  checkout_time TIME DEFAULT '11:00',
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_cleaners_user_id ON public.cleaners(user_id);
CREATE INDEX idx_assignments_listing_id ON public.assignments(listing_id);
CREATE INDEX idx_assignments_cleaner_id ON public.assignments(cleaner_id);
CREATE INDEX idx_schedule_items_listing_id ON public.schedule_items(listing_id);
CREATE INDEX idx_schedule_items_cleaner_id ON public.schedule_items(cleaner_id);
CREATE INDEX idx_schedule_items_check_out ON public.schedule_items(check_out);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_cleaners_updated_at BEFORE UPDATE ON public.cleaners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_schedule_items_updated_at BEFORE UPDATE ON public.schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert a test user for development
INSERT INTO auth.users (id, email, raw_user_meta_data) 
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', '{"name": "Test User"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;