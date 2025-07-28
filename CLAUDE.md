# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CleanSweep Scheduler is a Next.js 15 application for managing Airbnb property cleaning schedules. It integrates with calendar systems, manages cleaner assignments, and uses AI for schedule optimization.

**Current Status**: Complete full-stack implementation with PostgreSQL database, SMS-based cleaner authentication, and mobile cleaner portal. All major features are implemented with real data integration and visual feedback cues.

**Product Goal**: Automate cleaning schedules for Airbnb hosts by parsing .ics calendar links into structured schedules and daily messages, helping hosts assign cleaners and avoid missed turnovers.

## Essential Commands

### Development
```bash
npm run dev              # Start development server on port 9002 with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run Next.js linter
npm run typecheck        # Run TypeScript type checking
npm run genkit:dev       # Start Genkit AI development server
npm run genkit:watch     # Start Genkit with watch mode
```

### Docker Commands
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
- Docker environment includes PostgreSQL database
- Database migrations are in `supabase/migrations/`
- SMS authentication bypassed for testing (uses mock-token)

## Docker Development Setup

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
   - DATABASE_URL: postgresql://postgres:postgres@db:5432/cleansweep
   - NEXT_PUBLIC_SUPABASE_URL: http://localhost:9002
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

### Recent Updates (January 2025)

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

### Remaining TODOs
#### Medium Priority
- SMS Integration: Complete Twilio setup for production (currently using mock authentication)
- Settings page save functionality

#### Low Priority
- Conflict Detection: Warn about scheduling conflicts
- Remove cleaner edit page (replaced by inline edit)
- Multi-user Support: Team management features

### Future Features (from PRD)
- AI-powered schedule optimization (Genkit foundation exists)
- Predictive cleaning duration by stay length
- Auto-assignment based on cleaner workload
- Anomaly detection (late checkouts, overlaps)
- Smart rotation and checklist generation