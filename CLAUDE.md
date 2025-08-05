# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GoStudioM Smart Cleaning Calendar is a Next.js 15 application for managing Airbnb property cleaning schedules. Built for hosts, by a host - it integrates with calendar systems, manages cleaner assignments, and uses AI for schedule optimization.

**Current Status**: Production-ready at 90% completion. All core functionality complete, security and performance optimized. SMS integration pending A2P approval (1-3 days). Quick start guide planned for seamless user onboarding.

**Latest Session (2025-08-05)**:
- Fixed cleaner share link generation 500 errors:
  - Corrected column name from 'session_token' to 'token' in cleaner_sessions table queries
  - Updated getCleanerByShareToken and createCleanerShareToken functions
  - Share links now working properly for direct cleaner schedule access
- Twilio A2P 10DLC campaign status:
  - Existing campaign found (CMba872a661f73c51b9083efb214b6a727) in "In progress" status
  - Campaign is under review by TCR (The Campaign Registry)
  - Approval may take 2-3 weeks for Sole Proprietor campaigns
  - Once approved, SMS notifications can be enabled by adding phone number to messaging service MG16c2dd5b961df31963e30492e172f2c1
- **Previous work**:
  - Completed SMS integration and A2P 10DLC registration:
    - Added SMS opt-in tracking columns to production database
    - Normalized all phone numbers to 10-digit format
    - Successfully registered for A2P 10DLC compliance
    - Campaign ID: CMba872a661f73c51b9083efb214b6a727
    - Status: Pending approval (1-3 days)
  - Fixed all test failures:
    - Updated phone validation tests for normalized format
    - All 83 tests now passing
  - Created SMS debugging tools:
    - Test SMS page: `/test-sms`
    - SMS diagnostic: `/api/test/sms-diagnostic`
    - Config verification: `/api/test/twilio-config`
  - Planned comprehensive quick start guide:
    - 5-step interactive onboarding flow
    - Visual progress tracking with persistence
    - Auto-detection of completed actions
    - Expected completion time: 5-10 minutes
  - **Twilio Configuration**:
    - Phone number: +1 (628) 282-5326
    - Webhook URL: https://gostudiom.com/api/twilio/incoming
    - Environment variables set in Vercel

**Previous Session (2025-08-04 morning)**:
- Fixed type incompatibility between shared export interface and component interfaces
  - Added required fields to ScheduleItem interface
  - Build now succeeds without errors
- Updated branding with GoStudioM logo
  - Replaced SVG icons with custom logo (40px height)
  - Added proper favicon support for all devices
  - Fixed mobile header to display logo
  - Updated site title for better SEO: "Smart Cleaning Calendar - GoStudioM - Built for hosts, by a host"
- Fixed Monthly Trends graph responsiveness in stats page
  - Added responsive padding and height adjustments
  - Improved axis labels with smaller fonts and better spacing
  - Made Cleanliness Feedback chart responsive
- Implemented ResponsiveTable for Monthly Breakdown table
  - Converts to card view on mobile devices
  - Maintains full functionality across all screen sizes
- Configured Turborepo for monorepo architecture
  - Conservative approach: kept cleaning app at root
  - Created wrapper in apps/cleaning that redirects to root
  - Added placeholder for future analytics app
  - Zero breaking changes to existing functionality
  - Ready for gradual migration to shared packages

**Previous Session (2025-08-02)**:
- Fixed major production API failures caused by pg module incompatibility with Vercel Edge Runtime
- Created edge-compatible db-edge.ts module using Supabase client
- Fixed API response format issues (removed createApiResponse wrapper)
- Temporarily disabled 18 routes with raw SQL to achieve working build
- Upgraded richmontoya@gmail.com to Pro tier for unlimited listings
- Created missing /listings/[id]/cleaners pages (404 fix)
- Fixed manual-schedules table name mismatch (manual_schedules vs manual_schedule_rules)
- Optimized /stats page with 5-minute caching and parallel queries
- Fixed dashboard Total Listings card alignment
- Changed "Revenue" to "Cost" terminology throughout stats
- Fixed stats monthly breakdown to only show months with data
- Added listings dropdown filter to stats page

**Previous Session (2025-07-31)**:
- Fixed all Vercel build errors (pg module in client code, TypeScript errors)
- Updated Airbnb calendar instructions to match new UI flow
- All fixes deployed to production successfully
- Docker environment experiencing connectivity issues - system restart recommended
- **UNCOMMITTED CHANGES**: Updated Airbnb instructions in src/app/page.tsx (step 3: "Connect another calendar" > "Connect another website")

**Latest Session (2025-08-05)**:
- Refactored export logic into shared utility (`/src/lib/schedule-export.ts`):
  - Centralized export generation for dashboard and schedule pages
  - Fixed "Unit 4 - Next: 7 days later" showing for recurring schedules
  - Both exports now properly show "Monthly cleaning" for monthly schedules
- Created notification message utilities (`/src/lib/notification-messages.ts`):
  - `generateDailyReminder()` - For daily SMS reminders
  - `generateWeeklySchedule()` - For weekly schedule SMS
  - `generateTomorrowReminder()` - For evening reminders
  - All use the shared export logic for consistency
- Created example API routes for automated notifications:
  - `/api/notifications/send-daily/route.ts.example`
  - `/api/notifications/send-weekly/route.ts.example`
  - Ready to implement when Twilio SMS is configured

**Previous Session (2025-08-04)**:
- Fixed manual monthly schedules appearing as "weekly cleaning" in export
- Added full Canadian timezone and phone number support
- Removed deprecated cleaner edit page (`/cleaners/[id]/edit`)
- Documented SMS timezone strategy in `NOTIFICATION_TIMEZONE_PLAN.md`
- Fixed mobile responsiveness for stats Monthly Breakdown table
- Production readiness: 90% complete (only Twilio SMS integration remaining as critical blocker)
- Supabase security settings configured (OTP expiry, leaked password protection)
- All core environment variables set in production

**Previous Session (2025-08-03)**:
- Fixed all remaining test failures (82/82 tests passing)
- Resolved ESM module compatibility issues with isows
- Updated API route imports from db to db-edge for Vercel compatibility
- Fixed API response format expectations in tests
- Added proper mock setup for parseRequestBody
- Updated cleanerSchema to trim whitespace from names
- Preparing for monorepo migration to support multiple tools
- Fixed cancelled Airbnb bookings not showing in schedule:
  - Updated ICS parser to skip STATUS:CANCELLED events
  - Enhanced sync to detect bookings removed from ICS feed
  - Created Docker-specific sync function using direct PostgreSQL
  - Fixed settings page to use bulk sync endpoint instead of individual listing sync
  - Verified L3-RV cancellation properly marked in database

**Product Goal**: Automate cleaning schedules for Airbnb hosts by parsing .ics calendar links into structured schedules and daily messages, helping hosts assign cleaners and avoid missed turnovers.

## Branch Strategy

- **`local` branch**: Development environment with local Supabase
- **`main` branch**: Production environment with Supabase cloud

## Essential Commands

### Development (local branch)
```bash
git checkout local       # Switch to development branch
supabase start          # Start local Supabase
npm run dev             # Start development server on port 9002 with Turbopack
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run Next.js linter
npm run typecheck       # Run TypeScript type checking
npm run genkit:dev      # Start Genkit AI development server
npm run genkit:watch    # Start Genkit with watch mode
```

### Docker Commands (Alternative to Supabase CLI)
```bash
docker-compose up -d --build  # Start Docker environment with PostgreSQL
docker-compose down           # Stop Docker environment
docker-compose restart app    # Restart app container
docker logs clean-calendar-app-1  # View app logs
docker exec -it clean-calendar-app-1 sh  # Access app container shell
```

### Common Development Tasks
```bash
# Run a specific component in development
npm run dev -- --port 3000

# Check types before committing
npm run typecheck

# Run linter with auto-fix
npm run lint -- --fix
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.3.3 with App Router
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form + Zod validation
- **Database**: PostgreSQL with direct client connections
- **Authentication**: Custom SMS-based authentication for cleaners
- **AI**: Google Genkit for schedule optimization
- **Hosting**: Vercel for production deployment

### Key Architectural Patterns

#### 1. App Router Structure
All pages use Next.js 15 App Router in `src/app/`. Each route has:
- `page.tsx` - The page component
- `layout.tsx` (if needed) - Layout wrapper
- Server components by default, use `'use client'` when needed

#### 2. Component Organization
- `src/components/ui/` - shadcn/ui components (40+ components)
- `src/components/` - Feature-specific components
- Components follow the pattern: `export function ComponentName() {}`

#### 3. Data Flow
- Database operations in `src/lib/db.ts`
- Types defined in `src/types/`
- Custom hooks in `src/hooks/`
- AI flows in `src/ai/flows/`
- Cleaner authentication in `src/lib/cleaner-auth.ts`

#### 4. Styling Approach
- Tailwind CSS with custom configuration
- CSS variables for theming (defined in globals.css)
- Design system colors:
  - Primary: `hsl(var(--primary))` (teal)
  - Background: `hsl(var(--background))` (off-white)
  - Accent: `hsl(var(--accent))` (muted blue)

### Important Patterns

#### Form Handling
Use React Hook Form with Zod schemas:
```typescript
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { /* ... */ }
})
```

#### Path Imports
Use the `@/` alias for imports:
```typescript
import { Button } from "@/components/ui/button"
import { cleaners } from "@/data/cleaners"
```

#### Client Components
Mark components that use hooks or browser APIs:
```typescript
'use client'

export function InteractiveComponent() {
  // Component with useState, useEffect, etc.
}
```

## Key Features and Routes

### Admin/Manager Routes
- `/dashboard` - Main dashboard with metrics
- `/listings` - Property management with ICS integration
- `/cleaners` - Cleaner directory and management
- `/assignments` - Link cleaners to properties
- `/schedule` - View and manage cleaning schedule (list, weekly, monthly views)
- `/manual-schedules` - Manage recurring manual cleanings
- `/feedback` - View and analyze cleaner feedback
- `/stats` - Analytics and performance metrics
- `/settings` - Sync settings and preferences

### Mobile Cleaner Portal
- `/cleaner` - SMS-based login for cleaners
- `/cleaner/verify` - SMS code verification
- `/cleaner/dashboard` - Mobile dashboard with today's cleanings
- `/cleaner/cleaning/[id]` - Individual cleaning detail with feedback form
- `/share/[token]` - Public schedule sharing

## Development Notes

- TypeScript errors are ignored during builds (see next.config.ts)
- ESLint errors are also ignored in production builds
- Port 9002 is the default development port
- **Development**: Use `local` branch with local Supabase instance
- **Production**: Use `main` branch with Supabase cloud
- Database migrations are in `supabase/migrations/`
- SMS authentication bypassed for testing (uses mock-token)
- **Authentication**: Dev mode uses mock auth - click "Sign in with Google" to set dev cookie
- **Recent Fixes (2025-07-31)**: 
  - RLS performance optimized - all auth.uid() calls now cached
  - Missing user_settings table created in production
  - Security settings configured - OTP expiry reduced, leaked password protection enabled
  - Mobile optimization complete with responsive components

## Docker Development Setup (Alternative to Supabase CLI)

**Note**: Docker setup is for development only. For production, use Supabase cloud.

**IMPORTANT**: Always use Docker commands for local development. Do NOT use `npm run dev` directly.

1. **Start the environment**:
   ```bash
   npm run docker:dev
   # OR
   docker-compose up -d --build
   ```

2. **View logs** (essential for debugging auth issues):
   ```bash
   docker logs -f clean-calendar-app-1
   ```

3. **Restart after environment changes**:
   ```bash
   docker-compose restart app
   ```

4. **Access services**:
   - App: http://localhost:9002
   - Cleaner Portal: http://localhost:9002/cleaner/dashboard
   - PostgreSQL: localhost:5433 (postgres/postgres)

5. **Environment variables**:
   **For Development (local branch)**:
   - DATABASE_URL: `postgresql://postgres:postgres@localhost:54321/postgres`
   - NEXT_PUBLIC_SUPABASE_URL: `http://localhost:54321`
   - NEXT_PUBLIC_SUPABASE_ANON_KEY: (from `supabase start` output)
   - CRON_SECRET: (generate with: `openssl rand -base64 32`)
   
   **For Production (main branch)**:
   - DATABASE_URL: Get from Supabase Dashboard > Settings > Database
     - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`
     - Example: `postgresql://postgres:abc123xyz@db.puvlcvcbxmobxpnbjrwp.supabase.co:5432/postgres`
   - NEXT_PUBLIC_SUPABASE_URL: `https://[YOUR-PROJECT-REF].supabase.co`
   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Get from Supabase Dashboard > Settings > API
   
   **For Docker Development**:
   - DATABASE_URL: postgresql://postgres:postgres@db:5432/cleansweep
   - NEXT_PUBLIC_SUPABASE_URL: (Set in .env.local)
   - NEXTAUTH_URL: http://localhost:9002

## Implementation Status

### Completed Features
All major features are implemented and functional with real database integration:

#### Admin/Manager Features
- ✅ **Dashboard**: Metrics with real data
- ✅ **Listings Management**: Full CRUD with ICS calendar sync
- ✅ **Cleaners Directory**: Full CRUD with phone/email
- ✅ **Assignments**: Link cleaners to properties
- ✅ **Schedule Views**: List, weekly, monthly calendar views
- ✅ **Manual Scheduling**: Support for non-Airbnb properties
- ✅ **Export Functionality**: Text-based exports for cleaners
- ✅ **Share Links**: Secure schedule sharing with tokens
- ✅ **Statistics**: Historical data and analytics
- ✅ **Settings**: Sync management and preferences

#### Mobile Cleaner Portal
- ✅ **SMS Authentication**: Phone-based login system
- ✅ **Mobile Dashboard**: Today's cleanings with progress tracking
- ✅ **Cleaning Details**: Individual cleaning with feedback forms
- ✅ **Feedback System**: Cleanliness ratings and notes
- ✅ **Visual Cues**: Clear indicators for actions needed (orange ring/pulsing dot)
- ✅ **Session Management**: Secure 30-day sessions
- ✅ **Progress Tracking**: Today's completion percentage
- ✅ **Multiple Views**: Today/Week/All time filters

#### Database & Backend
- ✅ **PostgreSQL Integration**: Full database with migrations
- ✅ **ICS Calendar Parsing**: Airbnb calendar synchronization
- ✅ **Real-time Data**: Live updates and sync tracking
- ✅ **Data Persistence**: Historical data preservation
- ✅ **Security**: Row-level security and session management

### Recent Updates (July 2025)

#### Calendar Sync System
- ✅ **Automated Sync**: Vercel cron job runs every 3 hours to sync all listings
- ✅ **Manual Sync Button**: Dashboard "Sync All" button with last sync time display
- ✅ **Cron Endpoint**: Dedicated `/api/cron/sync-all` endpoint secured with CRON_SECRET
- ✅ **Historical Data Preservation**: All booking modifications tracked in modification_history JSONB
- ✅ **Single-User Optimization**: Currently hardcoded for primary user, ready for multi-tenant expansion
- ✅ **Auto-Sync on Creation**: New listings with ICS URLs sync automatically
- ✅ **Auto-Sync on Update**: Syncs when ICS URL is added or changed
- ✅ **Public User Flow**: Seamless import from landing page through to synced schedule

#### Manual Schedule System Improvements
- ✅ **Regeneration Feature**: When editing manual schedules, changing frequency/pattern prompts to regenerate schedule items
- ✅ **Regenerate Button**: Added explicit regenerate button to delete old items and create new ones
- ✅ **Delete Improvements**: Deleting a manual schedule now also removes all associated schedule items
- ✅ **Frequency Display Fix**: "Next Check-in" column now correctly shows manual rule frequency (e.g., "Monthly") even if items were generated with different pattern

#### Cleaner Feedback System
- ✅ **Feedback Display in Schedule**: Added visual feedback column showing cleanliness ratings with icons:
  - 😊 Clean (green)
  - 😐 Normal (blue) 
  - 😟 Dirty (orange)
- ✅ **Feedback Summary Page** (`/feedback`): Comprehensive feedback management with:
  - Statistics cards showing rating breakdowns with percentages
  - Advanced filters (date range, property, cleaner, rating)
  - Detailed feedback table with notes
  - CSV export functionality
- ✅ **Listing Details Page**: Added feedback section to individual property pages showing:
  - Cleanliness statistics with visual indicators
  - Feedback coverage percentage with progress bar
  - Recent cleanings with feedback ratings
  - Breakdown by rating type (Clean/Normal/Dirty)
- ✅ **Stats Page Enhancement**: Added comprehensive cleanliness metrics section with:
  - Pie chart visualization of rating distribution
  - Average rating with trend indicators (up/down/stable)
  - Feedback coverage statistics
  - Month-over-month comparison
- ✅ **Dashboard Integration**: Recent feedback appears in the activity feed with visual indicators
- ✅ **Database Updates**: Feedback data now included in all schedule queries

#### Performance & Security Optimizations (July 31, 2025)
- ✅ **RLS Performance**: Fixed 14 inefficient auth.uid() calls by using (SELECT auth.uid()) pattern
- ✅ **Database Indexes**: Created 17 performance indexes for common query patterns
- ✅ **Connection Pooling**: Implemented with configurable pool sizes
- ✅ **Query Caching**: Added Next.js unstable_cache for frequently accessed data
- ✅ **Mobile Optimization**: 
  - Mobile-first Tailwind configuration with touch utilities
  - Responsive table component that converts to cards
  - Touch gesture support with swipe detection
  - Enhanced cleaner dashboard for mobile devices
- ✅ **Security Enhancements**:
  - Enabled leaked password protection via HaveIBeenPwned
  - Reduced OTP expiry to 1 hour (3600 seconds)
  - Fixed missing user_settings table in production

### Remaining TODOs

#### High Priority
- **Quick Start Guide**: Implement the planned onboarding flow
  - Interactive 5-step guide with progress tracking
  - Expected dev time: 1-2 days
- **SMS Cron Jobs**: Create automated notification jobs
  - Daily morning reminders
  - Weekly schedule summaries
  - Pending A2P approval

#### Medium Priority
- **Settings Page**: Save functionality not implemented
  - UI exists but doesn't persist changes
  - Add SMS notification preferences
- **Manual Override System**: For construction/maintenance scenarios
  - Ability to postpone cleanings
  - Mark properties temporarily unavailable

#### Low Priority
- **Conflict Detection**: Warn about scheduling conflicts
- **Multi-user Support**: Team management features
- **Extract UI Components**: Move to shared packages in monorepo

#### Known Issues Resolved
- ✅ pg module incompatibility with Vercel Edge Runtime (fixed with db-edge.ts)
- ✅ API response format inconsistencies (removed createApiResponse wrapper)
- ✅ Missing pages causing 404 errors (/listings/[id]/cleaners)
- ✅ Table name mismatches (manual_schedules vs manual_schedule_rules)
- ✅ Slow stats page (added caching and optimized queries)
- ✅ UI alignment issues (dashboard cards)
- ✅ Incorrect terminology ("Revenue" changed to "Cost")
- ✅ Empty months in stats (now filtered out)

### Production Deployment Status
1. **Database Migration** ✅
   - [x] Production DATABASE_URL configured
   - [x] All migrations run on production database
   - [x] RLS policies enabled and optimized

2. **Environment Variables** ✅
   - [x] NEXT_PUBLIC_SUPABASE_URL (production)
   - [x] NEXT_PUBLIC_SUPABASE_ANON_KEY (production)
   - [x] CRON_SECRET for scheduled sync jobs
   - [x] TWILIO_* credentials configured in Vercel

3. **API Routes** ✅
   - [x] Fixed critical routes for Edge Runtime
   - [x] All essential endpoints working
   - [ ] 18 routes disabled (non-critical)

4. **External Services**
   - [x] Twilio A2P 10DLC registration submitted (pending approval)
   - [x] Vercel cron jobs configured
   - [x] Domain and SSL certificates active

5. **Testing** ✅
   - [x] All 83 tests passing
   - [x] Test suite runs successfully
   - [ ] Test SMS with real phone numbers (pending A2P approval)

### Disabled Routes Documentation
See `DISABLED_ROUTES.md` for details on 15 API routes that were disabled due to Edge Runtime incompatibility. These routes contain valuable functionality that can be re-enabled after converting raw SQL to Supabase queries.

**High-value routes to consider fixing:**
- Automated calendar sync (cron jobs)
- Manual schedule generation
- Individual listing operations

### Future Features (from PRD)
- AI-powered schedule optimization (Genkit foundation exists)
- Predictive cleaning duration by stay length
- Auto-assignment based on cleaner workload
- Anomaly detection (late checkouts, overlaps)
- Smart rotation and checklist generation