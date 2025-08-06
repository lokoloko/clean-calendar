# Claude Code Implementation Guide - Airbnb Analytics Platform

## 🚨 CRITICAL INSTRUCTIONS FOR CLAUDE CODE

### DO NOT TOUCH
```
apps/calendar/     ← NEVER modify ANYTHING in this directory
apps/landing/      ← Leave alone unless specifically asked
packages/auth/     ← Use as-is, don't modify
packages/database/ ← Use existing client only
```

### YOUR WORKSPACE
```
apps/analytics/    ← ALL your work goes here
```

---

## 1. Project Setup Sequence

### Step 1: Initial Setup
```bash
# From monorepo root (gostudiom/)
cd apps
mkdir analytics
cd analytics

# Initialize Next.js with specific options
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# Update package.json name and scripts
# name: "@gostudiom/analytics"
# dev script port: 3001
```

### Step 2: Install Dependencies
```bash
# Core dependencies
pnpm add \
  @supabase/supabase-js \
  @stripe/stripe-js \
  stripe \
  recharts \
  pdf-parse \
  papaparse \
  date-fns \
  zod \
  zustand \
  @tanstack/react-query \
  playwright-core

# Dev dependencies  
pnpm add -D \
  @types/papaparse \
  @types/pdf-parse
```

### Step 3: Environment Setup
```bash
# Create .env.local in apps/analytics/
touch .env.local

# Required environment variables:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
BROWSERLESS_API_KEY=
REDIS_URL=
```

---

## 2. File Structure to Create

```
apps/analytics/
├── app/
│   ├── (auth)/                    # Protected routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Main dashboard
│   │   │   └── loading.tsx
│   │   ├── upload/
│   │   │   ├── page.tsx          # Upload interface
│   │   │   └── components/
│   │   │       ├── DropZone.tsx
│   │   │       ├── FileList.tsx
│   │   │       └── PropertySelector.tsx
│   │   ├── enhance/
│   │   │   ├── page.tsx          # AI enhancement flow
│   │   │   └── components/
│   │   │       ├── AIAssistant.tsx
│   │   │       ├── DataRequestCard.tsx
│   │   │       └── QualityIndicator.tsx
│   │   ├── analyze/
│   │   │   ├── page.tsx          # Analysis results
│   │   │   └── [propertyId]/
│   │   │       └── page.tsx
│   │   ├── portfolio/
│   │   │   └── page.tsx          # Portfolio comparison
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── (public)/
│   │   ├── page.tsx               # Landing page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   └── demo/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts           # File upload handler
│   │   ├── parse/
│   │   │   └── route.ts           # PDF/CSV parsing
│   │   ├── analyze/
│   │   │   └── route.ts           # Gemini analysis
│   │   ├── enhance/
│   │   │   ├── listing/
│   │   │   │   └── route.ts      # Scraping endpoint
│   │   │   └── quality/
│   │   │       └── route.ts      # Quality scoring
│   │   ├── payment/
│   │   │   ├── checkout/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts      # Stripe webhook
│   │   └── export/
│   │       ├── pdf/
│   │       │   └── route.ts
│   │       └── excel/
│   │           └── route.ts
│   │
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
│
├── components/
│   ├── ui/                        # Reusable UI components
│   │   ├── PropertyCard.tsx
│   │   ├── MetricCard.tsx
│   │   ├── PricingCalculator.tsx
│   │   └── ProgressBar.tsx
│   ├── charts/
│   │   ├── RevenueChart.tsx
│   │   ├── OccupancyChart.tsx
│   │   └── ComparisonChart.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── admin.ts               # Admin client
│   ├── parsing/
│   │   ├── pdf-parser.ts          # PDF parsing logic
│   │   ├── csv-parser.ts          # CSV parsing logic
│   │   └── property-detector.ts   # Property detection
│   ├── ai/
│   │   ├── gemini-client.ts       # Gemini API wrapper
│   │   ├── prompts.ts             # AI prompt templates
│   │   └── response-parser.ts     # Parse AI responses
│   ├── scraping/
│   │   ├── browserless-client.ts  # Browserless.io integration
│   │   └── listing-parser.ts      # Parse scraped data
│   ├── pricing/
│   │   ├── calculator.ts          # Pricing logic
│   │   └── plans.ts               # Plan definitions
│   ├── analytics/
│   │   ├── metrics.ts             # Metric calculations
│   │   ├── health-score.ts        # Health scoring
│   │   └── insights.ts            # Insight generation
│   └── utils/
│       ├── formatters.ts          # Data formatters
│       ├── validators.ts          # Input validation
│       └── constants.ts           # App constants
│
├── hooks/
│   ├── useUpload.ts               # File upload hook
│   ├── useAnalysis.ts             # Analysis state
│   ├── usePricing.ts              # Pricing calculations
│   └── useSubscription.ts         # Subscription management
│
├── stores/
│   ├── uploadStore.ts             # Upload state
│   ├── analysisStore.ts           # Analysis state
│   └── enhancementStore.ts        # Enhancement state
│
├── types/
│   ├── property.ts                # Property types
│   ├── analysis.ts                # Analysis types
│   ├── pricing.ts                 # Pricing types
│   └── api.ts                     # API types
│
└── middleware.ts                  # Auth middleware
```

---

## 3. Database Setup

### Run these migrations in Supabase:

```sql
-- 1. Properties table
CREATE TABLE IF NOT EXISTS analytics_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_hash VARCHAR(64) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'seasonal', 'inactive', 'expired')),
    health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
    last_booking_date DATE,
    months_inactive INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2),
    avg_monthly_revenue DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, property_hash)
);

-- 2. Sessions table
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    properties_found INTEGER DEFAULT 0,
    properties_selected INTEGER DEFAULT 0,
    data_completeness INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usage tracking
CREATE TABLE IF NOT EXISTS analytics_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES analytics_properties(id) ON DELETE CASCADE,
    session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    usage_type VARCHAR(20) CHECK (usage_type IN ('one_time', 'monthly')),
    credits_used INTEGER DEFAULT 1,
    price_paid DECIMAL(10,2),
    analysis_depth VARCHAR(20),
    data_completeness INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enhancements tracking
CREATE TABLE IF NOT EXISTS analytics_enhancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES analytics_properties(id) ON DELETE CASCADE,
    session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    enhancement_type VARCHAR(50),
    data_provided JSONB,
    quality_before INTEGER,
    quality_after INTEGER,
    ai_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Listing data cache
CREATE TABLE IF NOT EXISTS analytics_listing_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES analytics_properties(id) ON DELETE CASCADE,
    listing_url TEXT NOT NULL,
    listing_data JSONB NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    UNIQUE(property_id, listing_url)
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_user_status ON analytics_properties(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON analytics_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON analytics_usage(user_id, created_at DESC);

-- 7. Enable RLS
ALTER TABLE analytics_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_enhancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_listing_data ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
CREATE POLICY "Users can view own properties" ON analytics_properties
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON analytics_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON analytics_usage
    FOR ALL USING (auth.uid() = user_id);
```

---

## 4. Critical Implementation Order

### Phase 1: Core Upload Flow (Week 1)
1. ✅ Create upload page with DropZone
2. ✅ Implement PDF/CSV parsing
3. ✅ Property detection logic
4. ✅ Property selection UI
5. ✅ Basic pricing calculator

### Phase 2: Analysis Engine (Week 2)
1. ✅ Gemini API integration
2. ✅ Basic dashboard
3. ✅ Metric calculations
4. ✅ Health scoring
5. ✅ Report generation

### Phase 3: Enhancement Flow (Week 3)
1. ✅ AI Assistant UI
2. ✅ Data request cards
3. ✅ Quality scoring
4. ✅ Browserless integration
5. ✅ Progressive enhancement

### Phase 4: Payment & Subscription (Week 4)
1. ✅ Stripe integration
2. ✅ Usage tracking
3. ✅ Subscription management
4. ✅ Monthly monitoring
5. ✅ Upsell flow

---

## 5. Key Code Patterns

### Pattern 1: Server Actions (App Router)
```typescript
// Use server actions for data mutations
export async function uploadFiles(formData: FormData) {
  'use server';
  
  const supabase = createServerClient();
  const user = await getUser();
  
  // Process files
  // Return result
}
```

### Pattern 2: Client-Side State
```typescript
// Use Zustand for complex state
const useUploadStore = create((set) => ({
  files: [],
  properties: [],
  selectedProperties: new Set(),
  
  addFile: (file) => set((state) => ({
    files: [...state.files, file]
  })),
  
  selectProperty: (id) => set((state) => ({
    selectedProperties: new Set(state.selectedProperties).add(id)
  }))
}));
```

### Pattern 3: API Routes
```typescript
// API routes for external integrations
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Validate with Zod
    // Process request
    // Return Response
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
```

### Pattern 4: Progressive Enhancement
```typescript
// Stream results as they're ready
async function* analyzeProperties(properties: Property[]) {
  for (const property of properties) {
    const result = await analyzeProperty(property);
    yield result;
  }
}
```

---

## 6. Testing Checklist

### User Flow Tests
- [ ] Can upload PDF/CSV files
- [ ] Properties are detected correctly
- [ ] Selection UI works properly
- [ ] Pricing calculates correctly
- [ ] AI enhancement flow works
- [ ] Payment processes successfully
- [ ] Reports generate properly
- [ ] Dashboard displays data
- [ ] Portfolio comparison works
- [ ] Monthly upsell appears

### Edge Cases
- [ ] Corrupted PDF handling
- [ ] Empty CSV handling
- [ ] No properties found
- [ ] Payment failure recovery
- [ ] API rate limiting
- [ ] Scraping failures
- [ ] Large file handling
- [ ] Multiple file uploads
- [ ] Session recovery
- [ ] Subscription changes

---

## 7. Common Pitfalls to Avoid

### ❌ DON'T
- Modify anything in apps/calendar/
- Store sensitive data in localStorage
- Make synchronous API calls
- Parse PDFs on the client for large files
- Expose API keys to client
- Forget rate limiting
- Skip error boundaries
- Ignore TypeScript errors

### ✅ DO
- Use server components where possible
- Stream large responses
- Cache expensive operations
- Validate all inputs
- Handle errors gracefully
- Show loading states
- Provide feedback to users
- Test with real Airbnb data

---

## 8. Deployment Checklist

### Pre-deployment
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Stripe webhooks configured
- [ ] API keys secured
- [ ] Rate limiting enabled
- [ ] Error tracking setup
- [ ] Analytics tracking ready

### Vercel Configuration
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### Post-deployment
- [ ] Test payment flow
- [ ] Verify webhooks work
- [ ] Check API integrations
- [ ] Monitor error rates
- [ ] Track conversion funnel
- [ ] Set up alerts

---

## 9. Quick Reference

### Key Files to Start With
1. `app/page.tsx` - Landing page
2. `app/(auth)/upload/page.tsx` - Upload interface
3. `lib/parsing/pdf-parser.ts` - PDF parsing
4. `lib/ai/gemini-client.ts` - AI integration
5. `components/ui/PropertyCard.tsx` - Property display

### Environment Variables Needed
```bash
# Minimum to start
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

### Test Data Location
```
/test-data/
  sample-earnings.pdf
  sample-transactions.csv
  sample-properties.json
```

---

## 10. Questions to Ask Before Starting

1. Do you have access to the monorepo?
2. Are the Supabase credentials ready?
3. Is the Gemini API key available?
4. Should we start with CSV or PDF parsing?
5. Is Stripe already configured in the monorepo?
6. Are there any specific design system requirements?
7. Should we use the existing UI components package?

---

## Remember: BUILD ONLY IN apps/analytics/ DIRECTORY!