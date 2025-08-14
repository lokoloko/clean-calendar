# Vercel Analytics App Deployment Plan

## Overview
Plan to deploy the analytics app as a separate Vercel project from the main calendar app.

## Current Status
- Analytics app is fully functional locally (port 9003)
- Excluded from main build to prevent conflicts
- Has comprehensive test suite (21 tests passing)
- Merged to main branch

## Deployment Steps (When Ready)

### 1. Create New Vercel Project
```bash
# From GitHub integration in Vercel Dashboard
# - Import same repo (github.com/lokoloko/clean-calendar)
# - Name it: gostudiom-analytics
```

### 2. Configure Build Settings
- **Root Directory**: `apps/analytics`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher
- **Ignored Build Step**: `git diff HEAD^ HEAD --quiet apps/analytics`

### 3. Environment Variables Required
```env
# Database (can share with main app or use separate)
DATABASE_URL=postgresql://...

# App URL
NEXT_PUBLIC_APP_URL=https://analytics.gostudiom.com

# AI Features (optional but recommended)
GEMINI_API_KEY=your-gemini-api-key

# Browserless (for web scraping features)
BROWSERLESS_API_KEY=your-browserless-key
```

### 4. Domain Configuration
- Subdomain: `analytics.gostudiom.com`
- Add CNAME record in DNS
- Configure in Vercel project settings

### 5. Features to Enable
- **Free Tier**: 3 uploads/month, basic insights
- **Pro Tier ($29/month)**: Unlimited uploads, CSV support, exports
- **Enterprise**: Custom pricing, API access

### 6. Database Considerations
Options:
1. **Share with main app** - Use same Supabase instance
2. **Separate database** - New Supabase project for analytics
3. **Different provider** - PostgreSQL on Railway/Neon

### 7. Post-Deployment Tasks
- [ ] Test file upload functionality
- [ ] Verify AI insights generation
- [ ] Test PDF parsing
- [ ] Test CSV processing
- [ ] Configure monitoring/alerts
- [ ] Set up error tracking (Sentry)

### 8. Migration Path for Existing Data
Currently using sessionStorage, need to:
1. Implement database persistence
2. Add user authentication
3. Migrate local data to cloud

## Dependencies to Fix Before Deployment

### Build Issues
- Migration page temporarily disabled (needs path resolution fix)
- Some TypeScript strict mode issues in API routes

### Feature Completion
- User authentication system
- Stripe payment integration
- Database persistence layer
- Property URL mapping

## Commands for Local Testing
```bash
# Test analytics app independently
cd apps/analytics
npm run dev        # Runs on port 9003
npm run build      # Test production build
npm run test       # Run test suite
```

## Notes
- Analytics app is architecturally separate from main app
- Can be deployed immediately as MVP (with sessionStorage)
- Full production readiness requires auth + payments
- Consider launching as beta with free access initially

## Timeline Estimate
- **Quick Deploy (as-is)**: 1 hour
- **With Auth**: 1-2 days
- **With Payments**: 3-5 days
- **Full Production**: 1 week

---
*Saved for future reference when ready to deploy analytics app*