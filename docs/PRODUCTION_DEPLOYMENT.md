# Production Deployment Guide

## Prerequisites

- [ ] Supabase project set up
- [ ] Supabase CLI installed (`~/bin/supabase`)
- [ ] Domain name (optional but recommended)
- [ ] Google OAuth credentials configured
- [ ] Environment variables prepared

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Configure Environment Variables**
   - Copy `.env.production.example` to `.env.production`
   - Fill in all required values
   - In Vercel dashboard, add all environment variables

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Domain**
   - In Vercel dashboard, add your custom domain
   - Update OAuth redirect URLs in Google Console and Supabase

### Option 2: Railway

1. **Connect GitHub Repository**
   - Sign up at railway.app
   - Connect your GitHub repository

2. **Configure Environment Variables**
   - Add all variables from `.env.production.example`
   - Railway automatically detects Next.js

3. **Deploy**
   - Push to main branch
   - Railway auto-deploys

### Option 3: Render

1. **Create Web Service**
   - Connect GitHub repository
   - Choose "Web Service"
   - Build Command: `npm run build`
   - Start Command: `npm start`

2. **Configure Environment Variables**
   - Add all production variables
   - Set `NODE_ENV=production`

3. **Configure Health Checks**
   - Health Check Path: `/api/health/live`
   - Check Interval: 300 seconds

## Pre-Deployment Checklist

### 1. Database Migration

#### Option A: Using Supabase CLI (Recommended)
```bash
# Push all local migrations to Supabase
~/bin/supabase db push

# Or run specific migrations
~/bin/supabase migration up --linked
```

#### Option B: Using psql directly
```bash
# Apply all migrations to Supabase
psql $DATABASE_URL < supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL < supabase/migrations/002_add_recurring_schedules.sql
# ... continue for all migrations
```

### 2. Test Authentication
- [ ] Google OAuth working
- [ ] Session persistence
- [ ] Protected routes require auth
- [ ] Logout functionality

### 3. Data Migration
If you have data in local development:
```bash
# Export local data
docker exec clean-calendar-db-1 pg_dump -U postgres cleanings > local_backup.sql

# Import to Supabase (be careful with this!)
psql $DATABASE_URL < local_backup.sql
```

### 4. Update Configuration
- [ ] Update all redirect URLs to production domain
- [ ] Configure Supabase RLS policies
- [ ] Enable Supabase email confirmations

### 5. Security Checks
- [ ] All API routes check authentication
- [ ] Environment variables are secure
- [ ] No hardcoded secrets in code
- [ ] HTTPS enabled

## Post-Deployment

### 1. Monitor Health
- Check `/api/health` endpoint
- Monitor error logs
- Set up uptime monitoring

### 2. Configure Backups
- Enable Supabase automatic backups
- Set up backup retention policy
- Test backup restoration

### 3. Performance Optimization
- Enable Vercel/Netlify caching
- Configure CDN for static assets
- Monitor Core Web Vitals

### 4. Set Up Monitoring
```javascript
// Example Sentry configuration
// Install: npm install @sentry/nextjs

// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

## Troubleshooting

### Database Connection Issues
- Verify connection string format
- Check Supabase connection pooler
- Ensure IP allowlist (if applicable)

### Authentication Problems
- Verify redirect URLs match exactly
- Check Supabase auth settings
- Ensure cookies are set correctly

### Performance Issues
- Check database query performance
- Enable query logging
- Monitor memory usage at `/api/health`

## Rollback Procedure

1. **Vercel**: Use dashboard to instant rollback
2. **Railway/Render**: Redeploy previous commit
3. **Database**: Restore from Supabase backup

## Maintenance Mode

Create `src/app/maintenance/page.tsx`:
```typescript
export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Under Maintenance</h1>
        <p>We'll be back shortly!</p>
      </div>
    </div>
  );
}
```

Enable by redirecting all traffic in middleware when needed.