# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CleanSweep Scheduler is a Next.js 15 application for managing Airbnb property cleaning schedules. It integrates with calendar systems, manages cleaner assignments, and uses AI for schedule optimization.

**Current Status**: UI-only implementation with mock data. All pages and components are built but awaiting backend integration.

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
npm run docker:dev       # Start Docker environment with Supabase
npm run docker:down      # Stop Docker environment
npm run docker:build     # Build Docker containers
npm run docker:logs      # View app logs
npm run docker:shell     # Access app container shell
npm run supabase:types   # Generate TypeScript types from Supabase
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
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth with Google OAuth
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
- Mock data in `src/data/` for development
- Types defined in `src/types/`
- Supabase types in `src/types/supabase.ts`
- Custom hooks in `src/hooks/`
- AI flows in `src/ai/flows/`
- Supabase clients in `src/lib/supabase*.ts`

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

- `/dashboard` - Main dashboard with metrics
- `/listings` - Property management with ICS integration
- `/cleaners` - Cleaner directory and management
- `/assignments` - Link cleaners to properties
- `/schedule` - View and manage cleaning schedule
- `/stats` - Analytics and performance metrics

## Development Notes

- TypeScript errors are ignored during builds (see next.config.ts)
- ESLint errors are also ignored in production builds
- The app uses mock data from `src/data/` directory
- Port 9002 is the default development port
- Docker environment includes full Supabase stack
- Local development uses Supabase emulators

## Docker Development Setup

1. **Start the environment**:
   ```bash
   npm run docker:dev
   ```

2. **Access services**:
   - App: http://localhost:9002
   - Supabase Studio: http://localhost:54323
   - Supabase API: http://localhost:54321
   - Email testing (Inbucket): http://localhost:54324

3. **Environment variables**:
   - Development: `.env.development` (pre-configured for Docker)
   - Production: Create `.env.local` from `.env.local.example`

## Implementation Status

### Completed UI Pages (from PRD)
All UI pages are implemented and functional with mock data:
- ✅ Landing page with hero CTA
- ✅ Pricing page (3 tiers)
- ✅ Dashboard with key metrics
- ✅ Listings management
- ✅ Cleaners directory
- ✅ Assignments (cleaner-property linking)
- ✅ Schedule viewer with filters
- ✅ Stats page with charts
- ✅ Settings for notifications

### Backend Integration TODOs
The codebase has 31 TODO comments marking exact integration points:

#### High Priority (Data Integration)
- Replace mock data with database connections in:
  - `/src/app/listings/page.tsx` - 5 TODOs
  - `/src/app/schedule/page.tsx` - 5 TODOs
  - `/src/app/assignments/page.tsx` - 5 TODOs
  - `/src/app/cleaners/page.tsx` - 3 TODOs

#### Key Integration Points
1. **ICS Calendar Parsing**: Parse Airbnb .ics URLs to extract bookings
2. **Database CRUD**: All forms need submission handlers
3. **SMS/WhatsApp**: Twilio integration in settings
4. **Authentication**: Complete Google OAuth flow
5. **Export Features**: PDF/CSV generation for schedules

#### Mock Data Location
All mock data is centralized in `/src/data/mock-data.ts`:
- `mockCleaners`
- `mockListings` 
- `mockAssignments`
- `mockSchedule`

### Future Features (from PRD)
- AI-powered schedule optimization (Genkit foundation exists)
- Predictive cleaning duration by stay length
- Auto-assignment based on cleaner workload
- Anomaly detection (late checkouts, overlaps)
- Smart rotation and checklist generation