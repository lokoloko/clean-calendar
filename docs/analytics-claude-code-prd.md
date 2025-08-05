# Analytics App - Claude Code PRD for Turborepo Monorepo

## Project Context

Create an analytics application within the existing GoStudioM monorepo using Turborepo. The analytics app must be developed in isolation without breaking the existing calendar app, sharing authentication and CSS resources.

## 🚨 CRITICAL INSTRUCTION
**LEAVE THE CURRENT CALENDAR STRUCTURE COMPLETELY ALONE**
- Do not modify ANY files in the calendar app directory
- Do not refactor or "improve" calendar code
- Do not change calendar dependencies
- Do not update calendar configurations
- The calendar app is working - DO NOT TOUCH IT

## Monorepo Structure

```
gostudiom/
├── apps/
│   ├── calendar/              # Existing calendar app (DO NOT MODIFY)
│   ├── analytics/             # New analytics app (BUILD THIS)
│   └── landing/               # Existing landing page (NO LINK INITIALLY)
├── packages/
│   ├── ui/                    # Shared UI components
│   ├── config/                # Shared configurations
│   ├── database/              # Shared Supabase client
│   ├── auth/                  # Shared authentication (USE EXISTING)
│   └── styles/                # Shared CSS/Tailwind (USE EXISTING)
├── turbo.json                 # Turborepo configuration
├── package.json               # Root package.json
└── pnpm-workspace.yaml        # PNPM workspace config
```

## Development Requirements

### 1. Initial Setup

```bash
# Navigate to monorepo root
cd gostudiom

# Create analytics app
mkdir -p apps/analytics
cd apps/analytics

# Initialize Next.js app with TypeScript and Tailwind
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

### 2. Package.json Configuration

```json
// apps/analytics/package.json
{
  "name": "@gostudiom/analytics",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",  // Different port from calendar
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@gostudiom/auth": "workspace:*",
    "@gostudiom/database": "workspace:*",
    "@gostudiom/ui": "workspace:*",
    "@gostudiom/styles": "workspace:*",
    // Add other deps
  }
}
```

### 3. Turborepo Configuration

```json
// turbo.json - Add analytics to pipeline
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 4. Development Isolation

```json
// Root package.json scripts
{
  "scripts": {
    "dev": "turbo dev",
    "dev:calendar": "turbo dev --filter=@gostudiom/calendar",
    "dev:analytics": "turbo dev --filter=@gostudiom/analytics",  // Isolated dev
    "build": "turbo build",
    "build:analytics": "turbo build --filter=@gostudiom/analytics"
  }
}
```

## Shared Resources Integration

### 1. Authentication (USE EXISTING)

```typescript
// apps/analytics/lib/auth.ts
export { 
  supabase,
  useUser,
  useAuth,
  requireAuth 
} from '@gostudiom/auth';

// DO NOT create new auth logic
```

### 2. Styles (USE EXISTING)

```typescript
// apps/analytics/app/layout.tsx
import '@gostudiom/styles/globals.css';  // Shared styles
import './analytics.css';  // Analytics-specific styles only

// Use existing Tailwind config
```

### 3. Database (USE EXISTING)

```typescript
// apps/analytics/lib/db.ts
export { supabase } from '@gostudiom/database';

// Add analytics-specific tables via migrations
// DO NOT modify existing schemas
```

## Analytics App Structure

```
apps/analytics/
├── app/
│   ├── (auth)/                # Protected routes
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Main dashboard
│   │   ├── upload/
│   │   │   └── page.tsx       # File upload interface
│   │   ├── reports/
│   │   │   └── page.tsx       # Generated reports
│   │   └── settings/
│   │       └── page.tsx       # User settings
│   ├── (public)/              # Public routes
│   │   ├── page.tsx           # Analytics landing
│   │   └── pricing/
│   │       └── page.tsx       # Pricing page
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts       # PDF analysis endpoint
│   │   ├── export/
│   │   │   └── route.ts       # Report export
│   │   └── webhook/
│   │       └── stripe/
│   │           └── route.ts   # Payment webhooks
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Analytics-specific styles
├── components/
│   ├── upload/
│   │   ├── DropZone.tsx       # File upload component
│   │   ├── FileList.tsx       # Uploaded files display
│   │   └── ProgressBar.tsx    # Upload progress
│   ├── dashboard/
│   │   ├── MetricsGrid.tsx    # Key metrics display
│   │   ├── RevenueChart.tsx   # Chart components
│   │   └── PropertyList.tsx   # Property performance
│   └── shared/                # Analytics-specific shared
├── lib/
│   ├── pdf/
│   │   ├── parser.ts          # PDF parsing logic
│   │   └── analyzer.ts        # Data analysis
│   ├── ai/
│   │   └── gemini.ts          # Gemini AI integration
│   └── utils/
│       └── calculations.ts    # Analytics calculations
├── public/                    # Static assets
├── types/                     # TypeScript types
└── package.json              # Analytics package config
```

## Key Features to Implement

### Phase 1: Core Upload & Analysis
1. **File Upload Interface**
   - Drag-and-drop zone
   - File type validation
   - Progress indicators

2. **PDF Processing**
   - Client-side parsing with PDF.js
   - Data extraction
   - Validation

3. **Basic Dashboard**
   - Revenue metrics
   - Occupancy rates
   - Simple charts

### Phase 2: AI Integration
1. **Gemini API Integration**
   - Insights generation
   - Recommendations
   - Natural language summaries

2. **Advanced Analytics**
   - Trend analysis
   - Comparative metrics
   - Forecasting

### Phase 3: Monitoring & Reports
1. **Report Generation**
   - PDF export
   - Excel export
   - Infographics

2. **Monthly Monitoring**
   - Listing health checks
   - Progress tracking
   - Automated alerts

## Environment Variables

```bash
# apps/analytics/.env.local
# Use shared Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Analytics-specific
GEMINI_API_KEY=xxx
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
```

## Database Schema (Analytics Tables Only)

```sql
-- Add to existing Supabase instance
-- Prefix all tables with 'analytics_' to avoid conflicts

CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE analytics_monthly_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analytics_sessions(id),
  month DATE,
  property_name TEXT,
  revenue DECIMAL,
  nights_booked INTEGER,
  -- etc.
);
```

## Development Workflow

### 1. Start Development
```bash
# From monorepo root
pnpm install
pnpm dev:analytics  # Runs only analytics app
```

### 2. Testing Integration
```bash
# Test shared auth
pnpm dev  # Runs all apps
# Navigate to localhost:3001 (analytics)
# Ensure auth works with calendar app
```

### 3. Building
```bash
# Build only analytics
pnpm build:analytics

# Build all apps
pnpm build
```

## Important Constraints

### DO NOT:
1. **TOUCH THE CALENDAR APP DIRECTORY AT ALL**
2. Modify ANY files in apps/calendar/
3. Refactor or "improve" calendar code
4. Create new authentication logic
5. Change shared database schemas
6. Add links to analytics from landing page (initially)
7. Use the same port as calendar app
8. Break existing Turborepo pipelines
9. Suggest calendar improvements or refactoring

### DO:
1. Create analytics app in apps/analytics/ ONLY
2. Use existing shared packages
3. Create analytics-specific components
4. Add new database tables with 'analytics_' prefix
5. Maintain separate routing
6. Use existing auth context
7. Follow established code patterns
8. Work ONLY in the analytics directory

## Testing Strategy

1. **Isolated Testing**
   - Run analytics app alone
   - Verify all features work independently

2. **Integration Testing**
   - Run with calendar app
   - Test shared auth flow
   - Verify no conflicts

3. **Build Testing**
   - Ensure builds complete
   - No broken dependencies
   - Production readiness

## Deployment Notes

- Deploy as separate Vercel project initially
- Use same Supabase instance
- Environment variables for analytics only
- No public links until approved

## Success Criteria

1. Analytics app runs independently on port 3001
2. Shares authentication with calendar app
3. Uses existing styles/components where applicable
4. **CALENDAR APP REMAINS COMPLETELY UNTOUCHED**
5. Clean Turborepo setup
6. All features work in isolation
7. Can be deployed separately
8. Calendar app continues to work exactly as before

## Final Note to Claude Code

**PROCEED WITH THIS PLAN STRUCTURE EXACTLY AS SPECIFIED**
- Focus ONLY on creating the analytics app
- Leave the calendar structure completely alone
- Do not suggest improvements to existing code
- Work only in the apps/analytics/ directory
- If you need to understand how something works in calendar, look but DON'T TOUCH