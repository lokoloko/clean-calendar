# Analytics Database Setup Guide

## Overview
The analytics app shares the same database as the calendar app, using a separate `analytics` schema for data isolation.

## Setup Options

### Option 1: Local Development with Supabase CLI (Recommended)

1. **Start Docker Desktop** (required for Supabase)

2. **Start Supabase locally** (from root directory):
```bash
cd /Volumes/WORKING/Projects/clean-calendar
supabase start
```

3. **Get your local credentials**:
```bash
supabase status
```
This will show:
- API URL (usually http://localhost:54321)
- anon key
- service_role key

4. **Create analytics `.env.local`** in `apps/analytics/`:
```env
# Supabase Local Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key from supabase status]
SUPABASE_SERVICE_ROLE_KEY=[service_role key from supabase status]

# Development Mode
NEXT_PUBLIC_USE_AUTH=false
NODE_ENV=development

# API Keys
GEMINI_API_KEY=AIzaSyD2xTZABp-UxH0355ZWRSW_UPhItTBgB4k
BROWSERLESS_API_KEY=2SVmjXQy74ad8Hu806816ad6b641e50068100cc7f1d0d61d0
```

5. **Run migrations** (if not already applied):
```bash
supabase db push
```

### Option 2: Local Development with Docker Compose

1. **Start Docker Desktop**

2. **Use the analytics docker-compose** (from analytics directory):
```bash
cd apps/analytics
docker-compose up -d
```

3. **The `.env.local` is already configured** for Docker:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cleansweep
NEXT_PUBLIC_SUPABASE_URL=http://localhost:9003
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key-for-local-dev
NEXT_PUBLIC_USE_AUTH=false
```

### Option 3: Connect to Production Supabase

1. **Get production credentials** from Supabase Dashboard:
   - Go to https://app.supabase.com
   - Select your project
   - Go to Settings > API

2. **Create `.env.local`** in `apps/analytics/`:
```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Enable Auth for Production
NEXT_PUBLIC_USE_AUTH=true
NODE_ENV=production

# API Keys
GEMINI_API_KEY=AIzaSyD2xTZABp-UxH0355ZWRSW_UPhItTBgB4k
BROWSERLESS_API_KEY=2SVmjXQy74ad8Hu806816ad6b641e50068100cc7f1d0d61d0
```

## Database Schema

The analytics tables are created in the `analytics` schema:
- `analytics.properties` - Property listings
- `analytics.property_metrics` - Performance metrics
- `analytics.data_sources` - Uploaded data (PDFs, CSVs, scraped)
- `analytics.insights` - AI-generated insights
- `analytics.property_comparisons` - Comparison data

## Migration Status

The migration file `supabase/migrations/002_analytics_schema.sql` creates:
- Analytics schema
- All required tables
- Indexes for performance
- Row Level Security policies
- Triggers for updated_at

## Troubleshooting

### Docker not running
```bash
# Start Docker Desktop application
# Then retry the commands
```

### Supabase not installed
```bash
# Install Supabase CLI
brew install supabase/tap/supabase
```

### Port conflicts
- Calendar app uses: 9002 (app), 5433 (postgres), 54321 (supabase)
- Analytics app uses: 9003 (when run separately)

### Database connection errors
1. Check Docker/Supabase is running
2. Verify .env.local exists and has correct values
3. Check ports aren't blocked

## Current Issues to Fix

1. **Incorrect table references in analytics-db.ts**:
   - Uses `'analytics.properties'` but should use `'properties'` with schema parameter
   - Supabase client needs proper schema configuration

2. **Mock auth for development**:
   - Currently returns a hardcoded UUID for dev user
   - Should integrate with calendar app's auth system

3. **Environment variable consistency**:
   - Need to align with calendar app's configuration
   - Should share the same Supabase instance

## Next Steps

1. Start Docker Desktop
2. Choose a setup option above
3. Run the analytics app:
```bash
cd apps/analytics
npm run dev
```

4. Access at http://localhost:3000 (or configured port)