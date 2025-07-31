# Clean Calendar - Production Readiness Checklist

## Overview
This document outlines all the steps required to deploy Clean Calendar as an MVP to production using Vercel and Supabase.

## Current State Assessment

### ✅ What's Ready:
- Core functionality (Airbnb sync, scheduling, cleaner portal)
- Database schema with proper migrations
- Basic authentication for development
- Docker containerization
- Vercel cron job configuration
- Export functionality
- Mobile-responsive cleaner portal
- Manual schedule management
- Weekly/Monthly calendar views

### ⚠️ Major Issues to Fix:
1. **Hardcoded Development Values**
   - DEV_USER_ID (`00000000-0000-0000-0000-000000000001`) used in 17+ files
   - Localhost references in code
   - Development-only authentication (cookie-based)

2. **Security Concerns**
   - No CORS configuration
   - No global rate limiting (only SMS endpoint has basic limiting)
   - TypeScript/ESLint errors ignored in build
   - Mock authentication in production code
   - No security headers (CSP, HSTS, etc.)

3. **Missing Production Features**
   - No error monitoring/reporting
   - No structured logging system
   - SMS integration not completed (using 'mock-token' bypass)
   - No environment validation on startup
   - No health check endpoints

4. **Code Quality Issues**
   - TypeScript errors ignored (`ignoreBuildErrors: true`)
   - ESLint errors ignored (`ignoreDuringBuilds: true`)
   - Duplicate route files for dev/production
   - Generic error messages to clients

## Production Deployment Checklist

### Phase 1: Infrastructure Setup (Day 1)

#### 1.1 Supabase Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Note down project URL and API keys
- [ ] Run all migrations in order:
  ```bash
  001_initial_schema.sql
  002_add_booking_uid_constraint.sql
  003_add_listing_timezone.sql
  004_manual_schedules.sql
  005_add_share_tokens.sql
  006_add_cleaner_feedback.sql
  ```
- [ ] Enable Row Level Security (RLS) policies for all tables
- [ ] Set up authentication providers:
  - [ ] Enable Email/Password auth
  - [ ] Configure Google OAuth
  - [ ] Set up redirect URLs
- [ ] Configure database backups (daily)
- [ ] Set up database connection pooling

#### 1.2 Environment Configuration
- [ ] Create `.env.production` file with:
  ```env
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  
  # NextAuth
  NEXTAUTH_URL=https://your-domain.com
  NEXTAUTH_SECRET=[generate with: openssl rand -base64 32]
  
  # Google OAuth
  GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  
  # API Security
  SYNC_API_KEY=[generate secure random string]
  
  # Twilio (for SMS)
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_PHONE_NUMBER=+1234567890
  
  # App Config
  NEXT_PUBLIC_APP_URL=https://your-domain.com
  NODE_ENV=production
  ```
- [ ] Validate all required environment variables are set

### Phase 2: Code Preparation (Day 2-3)

#### 2.1 Remove Development Code
- [ ] Replace all instances of DEV_USER_ID with proper user context
- [ ] Update all API routes to use authenticated user ID:
  ```typescript
  // Replace this:
  const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'
  
  // With this:
  const user = await getAuthenticatedUser(request)
  const userId = user.id
  ```
- [ ] Remove development-only route files
- [ ] Remove localhost/127.0.0.1 references
- [ ] Remove mock authentication logic

#### 2.2 Fix Build Issues
- [ ] Fix all TypeScript errors
- [ ] Fix all ESLint warnings
- [ ] Update next.config.ts:
  ```typescript
  typescript: {
    ignoreBuildErrors: false, // Change to false
  },
  eslint: {
    ignoreDuringBuilds: false, // Change to false
  },
  ```
- [ ] Ensure build passes without errors

#### 2.3 Implement Security Features
- [ ] Add CORS configuration:
  ```typescript
  // middleware.ts
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  ```
- [ ] Add security headers:
  ```typescript
  // next.config.ts
  const securityHeaders = [
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    },
    {
      key: 'X-Content-Type-Options', 
      value: 'nosniff'
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains'
    }
  ]
  ```
- [ ] Implement rate limiting middleware
- [ ] Add input validation using Zod schemas
- [ ] Sanitize all user inputs

### Phase 3: Authentication Migration (Day 3)

#### 3.1 Update Middleware
- [ ] Replace cookie-based auth with Supabase Auth:
  ```typescript
  // src/middleware.ts
  import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
  
  export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session && protectedPaths.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    return res
  }
  ```

#### 3.2 Update API Routes
- [ ] Add authentication check to all API routes
- [ ] Implement getUserFromRequest helper
- [ ] Update all database queries to filter by authenticated user
- [ ] Add proper error responses for unauthenticated requests

#### 3.3 Update Frontend Auth
- [ ] Replace AuthContext with Supabase Auth
- [ ] Update login/logout flows
- [ ] Add proper session management
- [ ] Implement token refresh logic

### Phase 4: Feature Completion (Day 4)

#### 4.1 SMS Integration
- [ ] Set up Twilio account
- [ ] Purchase phone number
- [ ] Update send-code endpoint:
  ```typescript
  // Remove mock logic
  if (phoneNumber === '+11234567890' && code === 'mock-token') {
    // DELETE THIS BLOCK
  }
  
  // Implement real SMS
  const message = await twilioClient.messages.create({
    body: `Your Clean Calendar code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  })
  ```
- [ ] Add SMS delivery status tracking
- [ ] Implement retry logic for failed sends

#### 4.2 Error Handling & Logging
- [ ] Implement structured logging:
  ```typescript
  import winston from 'winston'
  
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  })
  ```
- [ ] Replace console.error with logger
- [ ] Add request ID tracking
- [ ] Implement error boundary components

#### 4.3 Add Health Checks
- [ ] Create /api/health endpoint
- [ ] Add database connectivity check
- [ ] Add external service checks (Twilio, Supabase)
- [ ] Return appropriate status codes

### Phase 5: Vercel Deployment (Day 4-5)

#### 5.1 Vercel Setup
- [ ] Connect GitHub repository to Vercel
- [ ] Configure production branch (main)
- [ ] Add all environment variables in Vercel dashboard
- [ ] Configure custom domain (if available)
- [ ] Enable HTTPS redirect

#### 5.2 Deploy Configuration
- [ ] Verify vercel.json cron job:
  ```json
  {
    "crons": [{
      "path": "/api/sync-all",
      "schedule": "0 6 * * *"
    }]
  }
  ```
- [ ] Set up preview deployments for PRs
- [ ] Configure build command: `npm run build`
- [ ] Set output directory: `.next`

#### 5.3 First Deployment
- [ ] Run local build test: `npm run build`
- [ ] Deploy to staging/preview first
- [ ] Test all critical paths
- [ ] Deploy to production
- [ ] Verify cron job execution

### Phase 6: Monitoring Setup (Day 5)

#### 6.1 Error Tracking
- [ ] Set up Sentry account
- [ ] Install Sentry SDK:
  ```bash
  npm install @sentry/nextjs
  ```
- [ ] Configure Sentry:
  ```typescript
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
  ```
- [ ] Add error boundaries
- [ ] Configure alerts for critical errors

#### 6.2 Analytics & Monitoring
- [ ] Enable Vercel Analytics
- [ ] Set up uptime monitoring (UptimeRobot/Pingdom)
- [ ] Configure database monitoring in Supabase
- [ ] Set up log aggregation
- [ ] Create monitoring dashboard

#### 6.3 Alerts Configuration
- [ ] Sync job failures
- [ ] Database connection errors
- [ ] High error rates
- [ ] SMS delivery failures
- [ ] Authentication issues

### Phase 7: Testing & QA (Day 5)

#### 7.1 Functional Testing
- [ ] Test user registration/login flow
- [ ] Test Airbnb calendar sync
- [ ] Test manual schedule creation
- [ ] Test cleaner portal on mobile devices
- [ ] Test export functionality
- [ ] Test all CRUD operations

#### 7.2 Security Testing
- [ ] Test authentication boundaries
- [ ] Verify RLS policies work correctly
- [ ] Test rate limiting
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify CORS configuration

#### 7.3 Performance Testing
- [ ] Load test API endpoints
- [ ] Test concurrent user scenarios
- [ ] Verify cron job performance
- [ ] Check database query performance
- [ ] Optimize slow queries

### Phase 8: Documentation (Day 5)

#### 8.1 User Documentation
- [ ] Create user guide for property managers
- [ ] Create guide for cleaners
- [ ] Document FAQ
- [ ] Add in-app help tooltips

#### 8.2 Technical Documentation
- [ ] Update README with:
  - Production setup instructions
  - Environment variable reference
  - Deployment guide
  - Troubleshooting section
- [ ] Document API endpoints
- [ ] Create database schema diagram
- [ ] Document backup/restore procedures

#### 8.3 Operational Procedures
- [ ] Incident response plan
- [ ] Backup/restore runbook
- [ ] Scaling guidelines
- [ ] Monitoring checklist

## Post-Launch Tasks

### Week 1 - Stabilization
- [ ] Monitor error logs daily
- [ ] Check sync job success rate (target: >99%)
- [ ] Review user feedback
- [ ] Fix critical bugs immediately
- [ ] Monitor database performance
- [ ] Check SMS delivery rates

### Month 1 - Feature Completion
- [ ] Implement settings page save functionality
- [ ] Add conflict detection for manual schedules
- [ ] Fix timezone issues in stats page
- [ ] Add data export for GDPR compliance
- [ ] Implement automated database backups
- [ ] Add user activity logging

### Months 2-3 - Enhancement
- [ ] Multi-tenancy support
- [ ] Payment integration (Stripe)
- [ ] Calendar app integration (Google, Outlook)
- [ ] Advanced analytics dashboard
- [ ] Bulk operations for schedules
- [ ] Email notification system

## Cost Estimates

### Monthly Costs
- **Supabase**: 
  - Free tier: 0-500MB database, 2GB bandwidth
  - Pro tier: $25/mo (8GB database, 50GB bandwidth)
- **Vercel**: 
  - Hobby: Free (100GB bandwidth)
  - Pro: $20/mo (1TB bandwidth)
- **Twilio**: 
  - Phone number: $1/mo
  - SMS: ~$0.0075 per message
  - Estimated: $10-50/mo depending on usage
- **Sentry**: 
  - Free tier: 5K errors/mo
  - Team: $26/mo (50K errors)
- **Domain**: ~$12/year

**Total Estimated Cost**: $50-100/month for production

## Critical Success Metrics
- Sync job success rate > 99%
- API response time < 200ms (p95)
- Zero data loss incidents
- SMS delivery rate > 95%
- User session duration > 5 minutes
- Error rate < 0.1%

## Risk Mitigation

### Technical Risks
1. **Database scaling**: Monitor usage, upgrade plan before limits
2. **API rate limits**: Implement caching, optimize queries
3. **SMS delivery**: Have backup notification method (email)
4. **Data loss**: Daily backups, point-in-time recovery

### Business Risks
1. **User adoption**: Focus on user onboarding
2. **Cleaner resistance**: Emphasize mobile-first design
3. **Airbnb API changes**: Monitor for deprecations
4. **Competition**: Rapid feature iteration

## Go/No-Go Checklist
Before launching, ensure:
- [ ] All DEV_USER_ID references removed
- [ ] Authentication fully implemented
- [ ] SMS integration working
- [ ] Error monitoring active
- [ ] Backups configured
- [ ] Security headers in place
- [ ] Rate limiting enabled
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Support process defined

## Timeline Summary
- **Day 1**: Infrastructure setup (Supabase, environment)
- **Day 2-3**: Code fixes and security implementation
- **Day 3**: Authentication migration
- **Day 4**: Feature completion and Vercel setup
- **Day 5**: Monitoring, testing, and documentation
- **Total**: 5 days for MVP deployment

This checklist provides a comprehensive path to production readiness while maintaining focus on MVP functionality and security.