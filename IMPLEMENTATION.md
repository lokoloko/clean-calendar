# CleanSweep Scheduler - Implementation Documentation

## Overview
CleanSweep Scheduler is a web application designed to manage cleaning schedules for Airbnb properties and other rental units. It synchronizes with Airbnb calendars, manages cleaner assignments, and provides various views and export options for cleaning schedules.

## Features Implemented

### 1. **Calendar Synchronization**
- Sync with Airbnb ICS calendar URLs
- Automatic detection of bookings and checkout dates
- Preservation of historical data
- Cancellation tracking for removed bookings
- Support for multiple timezones per listing

### 2. **Listing Management**
- Create listings with or without Airbnb ICS URLs
- Support for non-Airbnb properties (manual properties)
- Timezone configuration per listing
- Cleaning fee tracking
- Active/inactive status for Airbnb integration

### 3. **Cleaner Management**
- Add/edit/delete cleaners
- Contact information (phone, email)
- Assignment to multiple properties
- Inline editing capabilities

### 4. **Schedule Views**
- **List View**: Traditional table view with sorting and filtering
- **Weekly View**: 7-day calendar grid with drag-to-add functionality
- **Monthly View**: Full month calendar with day summaries
- Visual indicators for same-day turnarounds
- Timezone display for properties in different zones

### 5. **Manual Scheduling**
- One-time manual cleanings
- Recurring cleaning schedules:
  - Daily
  - Weekly (specific days)
  - Biweekly
  - Monthly (specific day of month)
  - Custom intervals
- Support for long-term guests
- Manual schedule generation for future dates

### 6. **Export Functionality**
- Text-based export for easy copy/paste
- Cleaner-specific schedules
- Today only or date range options
- Includes next check-in information
- Formatted for SMS/messaging apps

### 7. **Statistics & Analytics**
- Monthly revenue/cost tracking
- Occupancy rate calculations
- Booking patterns by week
- Most common checkout days
- Historical data preservation for past months

### 8. **Sync Management**
- Individual listing sync
- Sync All functionality in settings
- Progress tracking during bulk sync
- Error handling and reporting
- Last sync timestamp tracking

### 9. **Mobile Cleaner Portal**
- SMS-based authentication for cleaners
- Phone number verification with 6-digit codes
- Secure session management (30-day tokens)
- Mobile-optimized login and verification pages
- Foundation for cleaner dashboard and feedback system

## Technical Implementation

### Database Schema

#### Core Tables:
- `profiles`: User information
- `listings`: Property information with timezone support
- `cleaners`: Cleaner contact details
- `assignments`: Cleaner-property relationships
- `schedule_items`: All cleaning events (Airbnb & manual)
- `manual_schedule_rules`: Recurring schedule configurations
- `cleaner_feedback`: Cleaning job feedback and ratings
- `cleaner_auth_codes`: SMS verification codes for cleaners
- `cleaner_sessions`: Cleaner authentication sessions

#### Key Features:
- UUID primary keys for all tables
- Soft delete via status fields (cancelled bookings preserved)
- Source tracking (airbnb/manual/manual_recurring)
- Timezone-aware date handling

### API Endpoints

- `GET/POST /api/listings` - Listing management
- `POST /api/listings/[id]/sync` - Individual calendar sync
- `GET/POST /api/cleaners` - Cleaner management
- `GET/POST /api/assignments` - Assignment management
- `GET /api/schedule?includeHistory=true` - Schedule retrieval
- `GET/POST /api/manual-schedules` - Manual schedule rules
- `POST /api/manual-schedules/[id]/generate` - Generate recurring items
- `POST /api/manual-schedules/one-time` - Create one-time cleaning
- `POST /api/cleaner/auth/send-code` - Send SMS verification code
- `POST /api/cleaner/auth/verify` - Verify SMS code and create session

### Frontend Architecture

- **Framework**: Next.js 15 with App Router
- **UI Library**: Shadcn/ui components
- **State Management**: React hooks and context
- **Date Handling**: date-fns library
- **Styling**: Tailwind CSS

### Key Components

1. **Schedule Page** (`/src/app/schedule/page.tsx`)
   - Multi-view support (list/week/month)
   - Export modal with multi-step workflow
   - Manual cleaning creation
   - Real-time filtering

2. **Calendar Views** (`/src/components/schedule/`)
   - `weekly-view.tsx`: 7-day grid with navigation
   - `monthly-view.tsx`: Full calendar with popovers

3. **Settings Page** (`/src/app/settings/page.tsx`)
   - Sync All functionality
   - Progress tracking
   - Messaging preferences (UI ready for future implementation)

4. **Cleaner Portal Pages** (`/src/app/cleaner/`)
   - Mobile-optimized login page with phone input
   - SMS verification page with 6-digit code input
   - Foundation for dashboard and feedback system

## Docker Configuration

The application runs in Docker containers:
- **App Container**: Next.js application on port 9002
- **Database Container**: PostgreSQL 16 on port 5433
- **Automatic Migrations**: Applied on container start

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/cleansweep
NEXT_PUBLIC_SUPABASE_URL=http://localhost:9002
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key-for-local-dev
NEXTAUTH_URL=http://localhost:9002
NEXTAUTH_SECRET=development-secret-key-change-in-production
```

## Future Enhancements

1. **Authentication**: Replace mock auth with real authentication
2. **SMS Integration**: Complete Twilio integration for actual SMS sending
3. **Cleaner Dashboard**: Mobile dashboard with today's cleanings
4. **Feedback System**: Complete cleaner feedback and rating system
5. **Conflict Detection**: Warn about scheduling conflicts
6. **Mobile App**: React Native companion app
7. **Payment Tracking**: Integration with payment systems
8. **Multi-user Support**: Team management features
9. **Automated Reminders**: Daily/weekly schedule notifications
10. **Performance Dashboard**: Cleaner performance metrics

## Development Setup

1. Clone the repository
2. Install Docker and Docker Compose
3. Run `docker-compose up -d`
4. Access the application at `http://localhost:9002`

## Testing

Currently using manual testing. Future plans include:
- Unit tests with Jest
- Integration tests for API endpoints
- E2E tests with Playwright
- Performance testing for large datasets

## Deployment Considerations

1. **Database**: Migrate from Docker PostgreSQL to managed service
2. **Authentication**: Implement proper auth (Supabase/Auth0)
3. **Environment**: Separate staging and production environments
4. **Monitoring**: Add error tracking (Sentry) and analytics
5. **Backup**: Automated database backups
6. **SSL**: Enable HTTPS for production
7. **CDN**: Static asset optimization

## Maintenance

- Regular dependency updates
- Database backup procedures
- Performance monitoring
- Security updates
- Feature deprecation planning

Last Updated: July 16, 2025