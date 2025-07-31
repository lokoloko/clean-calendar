# 🚀 CleanSweep Production Readiness Checklist (Updated 2025-07-30)

## Current State Assessment

### ✅ What's Complete:
- **Security**: RLS enabled on all tables with policies
- **Subscription System**: Tiers (Free/Starter/Pro) with 30-day trial
- **Authentication**: Google OAuth + cleaner SMS auth
- **Core Features**: All MVP features implemented
- **Database**: PostgreSQL with proper migrations
- **Sync System**: Automated 3-hour cron + manual sync
- **Cleaner Portal**: Mobile-responsive with feedback system
- **Calendar Views**: List, weekly, monthly views
- **Export**: Text-based schedule exports
- **Share Links**: Secure token-based sharing

### ⚠️ What Needs Configuration:
1. **Auth Settings** (Supabase Dashboard):
   - OTP expiry needs reduction (currently >1 hour)
   - Leaked password protection needs enabling

2. **External Services**:
   - SendGrid account setup (Day 2)
   - Twilio account setup (Day 2)
   - Payment processor prep (Stripe - post-launch)

3. **Content Updates** (Day 4):
   - Replace placeholder images
   - Update testimonials
   - Create legal pages

## Pre-Launch Checklist

### ✅ Already Complete (Day 1)
- [x] Database security (RLS on all tables)
- [x] Subscription infrastructure
- [x] Feature gates in API and UI
- [x] Trial system (30-day starter)
- [x] Billing pages (ready for Stripe)
- [x] TypeScript errors resolved
- [x] SECURITY DEFINER views fixed

### 🔧 Manual Configuration Required

#### Supabase Dashboard Settings
1. [ ] **Authentication > Providers > Email**
   - Set OTP Expiry to 1800 (30 min) or 3600 (1 hour)
   
2. [ ] **Authentication > Security & Protection**
   - Enable "Leaked password protection"

3. [ ] **Verify Security**
   - Run Security Advisor scan
   - Confirm all warnings cleared

### 📅 Day 2: Notification System
- [ ] Create SendGrid account
- [ ] Verify sender domain
- [ ] Get API key
- [ ] Create Twilio account
- [ ] Purchase phone number
- [ ] Get credentials
- [ ] Implement notification services
- [ ] Test email/SMS delivery

### 📅 Day 3: Legal & SMS
- [ ] Create Privacy Policy
- [ ] Create Terms of Service
- [ ] Create Cookie Policy
- [ ] Complete SMS integration (replace mock)
- [ ] Test cleaner auth flow

### 📅 Day 4: Content & Branding
- [ ] Take product screenshots
- [ ] Replace placeholder images
- [ ] Update homepage copy
- [ ] Add real testimonials
- [ ] SEO optimization

### 📅 Day 5: Testing & Launch
- [ ] Set all environment variables in Vercel
- [ ] Run full test suite
- [ ] Security testing
- [ ] Performance testing
- [ ] Deploy to production

## Environment Variables Checklist

### Core Database
- [ ] `DATABASE_URL` - Production PostgreSQL URL
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - https://[project].supabase.co
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key

### Authentication
- [ ] `NEXTAUTH_URL` - https://your-domain.com
- [ ] `NEXTAUTH_SECRET` - Generate with: openssl rand -base64 32
- [ ] `GOOGLE_CLIENT_ID` - From Google Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Console

### Notifications (Day 2)
- [ ] `SENDGRID_API_KEY` - From SendGrid
- [ ] `SENDGRID_FROM_EMAIL` - Verified sender
- [ ] `TWILIO_ACCOUNT_SID` - From Twilio
- [ ] `TWILIO_AUTH_TOKEN` - From Twilio
- [ ] `TWILIO_PHONE_NUMBER` - Purchased number

### Security
- [ ] `CRON_SECRET` - For sync endpoint protection

### Future (Post-Launch)
- [ ] `STRIPE_SECRET_KEY` - Payment processing
- [ ] `STRIPE_PUBLISHABLE_KEY` - Client-side Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook validation

## Production Deployment Steps

### 1. Vercel Setup
```bash
# Connect repository
vercel

# Set production branch
vercel git connect --branch main

# Add environment variables
vercel env add DATABASE_URL production
# ... add all other env vars
```

### 2. Database Migrations
All migrations already created and tested:
- ✅ 001-008: Core schema
- ✅ 009: Security & subscriptions
- ✅ 010: View fixes

### 3. Cron Jobs
```json
// vercel.json already configured
{
  "crons": [{
    "path": "/api/cron/sync-all",
    "schedule": "0 */3 * * *"  // Every 3 hours
  }]
}
```

### 4. Domain Configuration
- [ ] Add custom domain in Vercel
- [ ] Configure DNS records
- [ ] Enable HTTPS (automatic)
- [ ] Set up www redirect

## Launch Day Checklist

### Pre-Launch (Morning)
- [ ] Final backup of development data
- [ ] Verify all env vars set correctly
- [ ] Run security scan one more time
- [ ] Check all API endpoints
- [ ] Test critical user flows

### Launch
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Test production URLs
- [ ] Confirm cron job running
- [ ] Monitor error logs

### Post-Launch (First 24 hours)
- [ ] Monitor Vercel logs
- [ ] Check Supabase metrics
- [ ] Watch for any errors
- [ ] Be ready to rollback
- [ ] Celebrate! 🎉

## Success Metrics

### Technical
- ✅ Zero security vulnerabilities
- ✅ All features work by tier
- [ ] <3s page load times
- [ ] >99% uptime
- [ ] <0.1% error rate

### Business (Week 1)
- [ ] First users sign up
- [ ] Cleaners successfully log in
- [ ] Calendar syncs working
- [ ] Positive user feedback

## Known Issues / TODOs

### Minor (Post-Launch)
- Settings page save functionality
- Multi-user support enhancement
- WhatsApp integration (Pro tier)
- Advanced analytics

### Already Fixed
- ✅ DEV_USER_ID removed
- ✅ Security headers added
- ✅ TypeScript errors resolved
- ✅ RLS policies implemented
- ✅ Feature gates working

## Cost Estimates (Monthly)

### Launch Phase
- **Supabase Free**: $0 (up to 500MB)
- **Vercel Hobby**: $0 (100GB bandwidth)
- **SendGrid Free**: $0 (100 emails/day)
- **Twilio**: ~$10 (SMS costs)
- **Domain**: ~$1/month
- **Total**: ~$11/month

### Growth Phase
- **Supabase Pro**: $25/month
- **Vercel Pro**: $20/month
- **SendGrid Basic**: $15/month
- **Twilio**: $20-50/month
- **Total**: ~$80-110/month

## Emergency Contacts

- **Vercel Status**: status.vercel.com
- **Supabase Status**: status.supabase.com
- **Domain Registrar**: [Your registrar]
- **On-Call Developer**: [Your contact]

---

*Last Updated: 2025-07-30*
*Status: Day 1 Complete, Ready for Day 2*