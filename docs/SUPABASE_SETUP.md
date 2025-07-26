# Supabase Setup Guide for Clean Calendar

## Overview
We'll use Supabase for:
1. PostgreSQL database (remote)
2. Authentication (Google OAuth + Email/Password)
3. Real-time subscriptions (future feature)
4. Storage (future feature for cleaner photos)

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login
3. Click "New Project"
4. Fill in:
   - Project name: `clean-calendar` (or your preference)
   - Database Password: (save this securely!)
   - Region: Choose closest to you
   - Pricing Plan: Free tier is fine to start

## Step 2: Get Your Credentials

Once project is created, go to Settings > API and note down:
- `Project URL`: https://xxxxxxxxxxxxx.supabase.co
- `Anon/Public Key`: eyJhbGciOiJS...
- `Service Role Key`: eyJhbGciOiJS... (keep this secret!)

## Step 3: Set Up Authentication

### Enable Email Auth
1. Go to Authentication > Providers
2. Email should be enabled by default
3. Configure email settings:
   - Enable email confirmations (recommended for production)
   - Customize email templates if desired

### Enable Google OAuth
1. Go to Authentication > Providers > Google
2. You'll need to set up Google OAuth:
   
#### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth Client ID
5. Choose "Web application"
6. Add Authorized redirect URIs:
   - `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
7. Copy Client ID and Client Secret

#### Back in Supabase:
1. Enter Google Client ID and Client Secret
2. Save

## Step 4: Database Migration

Since you already have data in your local database, we need to:

1. First, backup your local data:
```bash
./scripts/backup-data.sh
```

2. Get your Supabase database URL:
   - Go to Settings > Database
   - Copy the connection string (URI)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres`

3. Migrate schema to Supabase:
```bash
# Export schema from local
pg_dump $DATABASE_URL --schema-only --no-owner --no-acl > schema.sql

# Import to Supabase
psql YOUR_SUPABASE_DB_URL < schema.sql
```

4. Migrate data:
```bash
# Export data from local
pg_dump $DATABASE_URL --data-only --no-owner --no-acl > data.sql

# Import to Supabase
psql YOUR_SUPABASE_DB_URL < data.sql
```

## Step 5: Update Environment Variables

Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJS...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJS...

# Database (for direct connections)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Auth Mode
NEXT_PUBLIC_USE_AUTH=false  # Keep false until we implement auth
```

## Step 6: Enable Row Level Security (RLS)

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for dev mode (temporary)
-- These allow full access when USE_AUTH=false
CREATE POLICY "Dev mode - full access to listings" ON public.listings
  FOR ALL USING (true);

CREATE POLICY "Dev mode - full access to cleaners" ON public.cleaners
  FOR ALL USING (true);

CREATE POLICY "Dev mode - full access to schedule_items" ON public.schedule_items
  FOR ALL USING (true);

-- We'll update these policies when we implement auth
```

## Step 7: Test Connection

1. Update your `.env.local` with Supabase credentials
2. Restart your dev server
3. Test that everything still works

## Step 8: Google OAuth Configuration Details

For production, update Google OAuth settings:
1. Add your production domain to authorized URLs
2. Configure OAuth consent screen:
   - App name: Clean Calendar
   - User support email
   - App logo (optional)
   - Scopes: email, profile

## Next Steps

Once Supabase is set up:
1. We'll implement the auth components
2. Create login/signup pages
3. Add auth middleware
4. Migrate your data to your authenticated user
5. Update RLS policies for proper security

## Important Notes

- Keep `NEXT_PUBLIC_USE_AUTH=false` until auth is fully implemented
- Your data remains accessible during the transition
- Cleaner tokens will continue to work
- We'll do the user ID migration after you create your account