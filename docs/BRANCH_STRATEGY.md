# Branch and Environment Strategy

## Overview

CleanSweep Scheduler uses a two-branch strategy to separate development and production environments.

## Branches

### 🔧 `local` Branch (Development)
- **Purpose**: Active development and testing
- **Database**: Local Supabase instance (`supabase start`)
- **URL**: http://localhost:9002
- **Auth**: Mock authentication available

### 🚀 `main` Branch (Production)
- **Purpose**: Production-ready code
- **Database**: Supabase Cloud
- **URL**: https://your-domain.com (via Vercel)
- **Auth**: Full authentication with Google OAuth

## Workflow

### Development Process
1. Checkout `local` branch
2. Start local Supabase: `supabase start`
3. Make changes and test locally
4. Commit changes to `local` branch

### Deployment Process
1. Merge `local` changes to `main`
2. Push to GitHub
3. Vercel automatically deploys from `main`

## Environment Variables

### Development (.env.local on `local` branch)
```env
# Local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key  # Get from 'supabase start' output
DATABASE_URL=postgresql://postgres:postgres@localhost:54321/postgres

# Development settings
NEXT_PUBLIC_USE_AUTH=false
```

### Production (.env.production on `main` branch)
```env
# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-cloud-anon-key  # From Supabase Dashboard > Settings > API

# From Supabase Dashboard > Settings > Database > Connection string
# Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:abc123xyz@db.puvlcvcbxmobxpnbjrwp.supabase.co:5432/postgres

# Production settings
NEXT_PUBLIC_USE_AUTH=true
```

#### Where to find these values in Supabase Dashboard:

1. **Project Reference**: Dashboard > Settings > General > Reference ID
2. **Database Password**: Dashboard > Settings > Database > Database Password
3. **Connection String**: Dashboard > Settings > Database > Connection string
4. **Anon Key**: Dashboard > Settings > API > anon public key

## Quick Commands

### Switch to Development
```bash
git checkout local
supabase start
npm run dev
```

### Deploy to Production
```bash
git checkout main
git merge local
git push origin main
# Vercel auto-deploys
```

## Important Notes

1. **Never** commit production credentials to the repository
2. **Always** test on `local` branch before merging to `main`
3. **Database migrations** must be applied to both environments
4. **Vercel** should be configured to deploy only from `main` branch

## Database Migrations

### Apply to Local Development
```bash
git checkout local
supabase start
supabase db push
```

### Apply to Production
```bash
git checkout main
supabase link --project-ref your-project-ref
supabase db push
```