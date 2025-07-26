# Manual Migration Instructions for Supabase

Since we're having connection issues with the direct database URL, here's how to migrate your data manually through the Supabase dashboard:

## Step 1: Access Supabase SQL Editor
1. Go to your Supabase dashboard at https://app.supabase.com
2. Select your project (puvlcvcbxmobxpnbjrwp)
3. Click on "SQL Editor" in the left sidebar

## Step 2: Create Schema
Copy and paste this entire block into the SQL editor and run it:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    name VARCHAR(255) NOT NULL,
    ics_url TEXT,
    timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sync TIMESTAMP WITH TIME ZONE,
    is_active_on_airbnb BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.cleaners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    booking_uid VARCHAR(255) UNIQUE,
    guest_name VARCHAR(255),
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE NOT NULL,
    checkout_time TIME DEFAULT '11:00:00',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'airbnb',
    manual_rule_id UUID,
    is_completed BOOLEAN DEFAULT false,
    original_check_in TIMESTAMP WITH TIME ZONE,
    original_check_out TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    modification_history JSONB DEFAULT '[]'::jsonb,
    is_extended BOOLEAN DEFAULT false,
    extension_notes TEXT,
    previous_check_out TIMESTAMP WITH TIME ZONE,
    extension_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.manual_schedule_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    frequency VARCHAR(50) NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    time TIME DEFAULT '11:00:00',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    token VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    cleaner_id UUID REFERENCES public.cleaners(id),
    listing_ids UUID[] DEFAULT '{}',
    date_from DATE,
    date_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.cleaner_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.cleaner_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_item_id UUID NOT NULL REFERENCES public.schedule_items(id),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_listing_id ON public.schedule_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_cleaner_id ON public.schedule_items(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_check_out ON public.schedule_items(check_out);
CREATE INDEX IF NOT EXISTS idx_schedule_items_status ON public.schedule_items(status);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_cleaner_sessions_token ON public.cleaner_sessions(token);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_feedback ENABLE ROW LEVEL SECURITY;

-- Create temporary dev policies
CREATE POLICY "Dev mode - full access" ON public.listings FOR ALL USING (true);
CREATE POLICY "Dev mode - full access" ON public.cleaners FOR ALL USING (true);
CREATE POLICY "Dev mode - full access" ON public.schedule_items FOR ALL USING (true);
CREATE POLICY "Dev mode - full access" ON public.manual_schedule_rules FOR ALL USING (true);
CREATE POLICY "Dev mode - full access" ON public.share_links FOR ALL USING (true);
CREATE POLICY "Dev mode - full access" ON public.cleaner_sessions FOR ALL USING (true);
CREATE POLICY "Dev mode - full access" ON public.cleaner_feedback FOR ALL USING (true);
```

## Step 3: Import Your Data

The data export has been saved to:
- Schema: `./temp_schema.sql`
- Data: `./temp_data.sql`
- Backup: `./backups/clean_calendar_[timestamp].sql`

You can either:

### Option A: Use Supabase SQL Editor
1. Open `./temp_data.sql` in a text editor
2. Copy the INSERT statements
3. Paste into Supabase SQL Editor
4. Run the queries

### Option B: Use TablePlus or similar
1. Download TablePlus or another PostgreSQL client
2. Connect using the connection string from Supabase dashboard
3. Import the SQL files

## Step 4: Verify Migration
Run this in Supabase SQL Editor to verify:

```sql
SELECT 
    'listings' as table_name, 
    COUNT(*) as count 
FROM public.listings
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'schedule_items', COUNT(*) FROM public.schedule_items
UNION ALL
SELECT 'cleaners', COUNT(*) FROM public.cleaners;
```

You should see:
- listings: 17
- schedule_items: 82
- cleaners: 2

## Step 5: Update Your App

Your `.env.local` is already configured with the Supabase DATABASE_URL, so once the data is migrated, your app will automatically use Supabase!

## Alternative: Direct Connection String

If you need the direct connection string (not pooler), go to:
1. Supabase Dashboard > Settings > Database
2. Look for "Connection string" (not "Connection pooling")
3. It should be in format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`

The issue we encountered is likely because the `db.` subdomain is not the correct format for external connections.