# Airbnb Analytics MVP Implementation Plan

## Current State Analysis
- PDF parser has fundamental limitations (concatenated data without delimiters)
- Dashboard already shows disclaimers (* for estimated nights, ** for portfolio average stay)
- Transaction CSV parser exists but isn't fully integrated for property-level metrics
- No authentication or tier distinction yet

## Implementation Plan

### Phase 1: Enhanced CSV Processing & Data Accuracy
1. **Enhance Transaction CSV Parser** (`/lib/parsers/csv-parser.ts`)
   - Add property-level nights and average stay calculation from transactions
   - Calculate accurate metrics per property (nights, bookings, avg stay)
   - Merge CSV data with PDF data when both are available

2. **Update Upload API** (`/app/api/upload/route.ts`)
   - When CSV is provided, calculate property-specific metrics
   - Merge CSV metrics into PDF properties (overriding estimates)
   - Flag data source (PDF-only vs PDF+CSV) for tier distinction

3. **Update Dashboard Display** (`/app/dashboard/page.tsx`)
   - Remove asterisks when CSV data is available (accurate data)
   - Show data source indicator (e.g., "CSV verified" badge)
   - Display upgrade prompt for PDF-only users

### Phase 2: Free/Premium Tier Distinction
1. **Create Tier Configuration** (`/lib/config/tiers.ts`)
   - Define tier limits: Free (PDF only, 3 properties), Pro ($49/mo), Business ($149/mo)
   - Set feature flags per tier

2. **Add Upgrade Prompts** 
   - On upload page: "Upload CSV for accurate property metrics"
   - On dashboard: "Upgrade for precise nights & average stay data"
   - On mapping page: Show locked features for free tier

3. **Create Pricing Page** (`/app/pricing/page.tsx`)
   - Feature comparison table
   - Clear value propositions
   - Upgrade CTAs

### Phase 3: User Authentication & Accounts
1. **Implement Auth System** (`/lib/auth/`)
   - Use NextAuth.js for authentication
   - Support email/password and Google OAuth
   - Session management with JWT

2. **Create User Database Schema** (`/schema.sql`)
   - users table (id, email, tier, created_at)
   - subscriptions table (user_id, tier, status, expires_at)
   - uploads table (user_id, file_data, created_at)

3. **Add Account Pages**
   - `/login` - Sign in page
   - `/register` - Sign up page
   - `/account` - User dashboard with subscription info

### Phase 4: Payment Integration
1. **Stripe Integration** (`/lib/stripe/`)
   - Set up Stripe checkout for subscriptions
   - Webhook handlers for subscription events
   - Customer portal for managing subscriptions

2. **Payment API Routes**
   - `/api/checkout` - Create checkout session
   - `/api/webhooks/stripe` - Handle Stripe events
   - `/api/subscription` - Check subscription status

### Phase 5: Browserless.io Integration (Post-MVP)
1. **Property URL Collection**
   - Add form to collect Airbnb property URLs
   - Store URLs per user in database

2. **Browserless Scraping Service**
   - Daily monitoring jobs
   - Extract live pricing, availability, reviews
   - Store historical data

3. **Live Monitoring Dashboard**
   - Show real-time property metrics
   - Historical trends (30/90/365 days based on tier)
   - Competitor analysis features

## Files to Modify/Create

### Immediate (Phase 1):
- ✏️ `/lib/parsers/csv-parser.ts` - Enhance with property metrics
- ✏️ `/app/api/upload/route.ts` - Merge CSV data with PDF
- ✏️ `/app/dashboard/page.tsx` - Update display logic
- ✏️ `/app/mapping/page.tsx` - Show data quality indicators

### New Files:
- 📝 `/lib/config/tiers.ts` - Tier configuration
- 📝 `/app/pricing/page.tsx` - Pricing page
- 📝 `/lib/auth/auth.ts` - Authentication logic
- 📝 `/app/login/page.tsx` - Login page
- 📝 `/app/register/page.tsx` - Register page
- 📝 `/lib/stripe/client.ts` - Stripe integration
- 📝 `/app/api/checkout/route.ts` - Checkout API

## Data Flow

### Free Tier (PDF Only):
```
PDF Upload → Parse totals → Estimate property metrics → Show with disclaimers
```

### Premium Tier (PDF + CSV):
```
PDF + CSV Upload → Parse both → Use CSV for accurate metrics → Merge data → Show verified data
```

### Business Tier (PDF + CSV + URLs):
```
All uploads + Property URLs → Parse & merge → Browserless monitoring → Live dashboard
```

## Value Propositions

### Free Tier:
- Portfolio overview
- Revenue tracking
- Basic health scores
- Limited to 3 properties
- Estimated metrics only

### Pro Tier ($49/mo):
- Unlimited properties
- Accurate property metrics (CSV required)
- Excel/PDF reports
- 90-day history
- Email support

### Business Tier ($149/mo):
- Everything in Pro
- Live property monitoring
- Competitor analysis
- 365-day history
- Market insights
- Priority support

## Technical Stack
- **Frontend**: Next.js 15, React, TailwindCSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (via Supabase)
- **Auth**: NextAuth.js
- **Payments**: Stripe
- **Monitoring**: Browserless.io
- **File Processing**: pdf-parse, PapaParse
- **AI**: Google Gemini API

## MVP Success Metrics
1. Accurate property-level metrics with CSV
2. Clear free/premium distinction
3. Working payment flow
4. User accounts with data persistence
5. Professional reports (Excel/PDF)

## Timeline Estimate
- Phase 1: 1-2 days (CSV enhancement)
- Phase 2: 1 day (tier system)
- Phase 3: 2-3 days (authentication)
- Phase 4: 2 days (payments)
- Phase 5: 3-4 days (Browserless integration)

**Total MVP: 5-7 days**
**Full Platform: 10-12 days**

## Next Steps
1. Start with Phase 1 (CSV enhancement) for immediate value
2. Add basic auth (Phase 3) to enable user accounts
3. Implement payments (Phase 4) for monetization
4. Deploy MVP and gather user feedback
5. Add Browserless monitoring as premium feature

This approach delivers immediate value with accurate CSV data while building toward the full monitoring platform.