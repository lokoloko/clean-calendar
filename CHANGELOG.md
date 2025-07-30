# Changelog

## [Unreleased] - 2025-07-29

### Fixed
- Dashboard syntax errors: Fixed feedbackRes scope issue by using pre-parsed feedbackData
- Code indentation: Corrected inconsistent indentation in schedule.forEach block
- Parsing errors: Removed extra closing brace causing "Expression expected" errors
- Dashboard now loads successfully in both development and production environments

### Added
- Google authentication setup guide for local development (docs/GOOGLE_AUTH_LOCAL_SETUP.md)
- Docker troubleshooting documentation

### Technical Details
- Fixed variable scope issue where feedbackRes was accessed outside its declaration scope
- Standardized indentation to 2 spaces in dashboard component
- Dashboard now properly handles all API responses with graceful error handling

## [Previous] - 2025-07-28

### Fixed
- Next.js 15 build error: Added Suspense boundary for useSearchParams in schedule page
- Dashboard API authentication: Fixed 401 errors by using requireAuth() consistently
- Dashboard loading error: Fixed response body stream already read issue
- API error handling: Improved graceful degradation when individual APIs fail

### Technical Details
- Created schedule-content.tsx component wrapped with Suspense boundary
- Updated cleaner feedback API route to use proper authentication
- Fixed duplicate response body reading in dashboard data fetching
- Added comprehensive error logging for debugging

## [Previous] - 2025-07-21

### Added
- Historical data tracking for bookings (extensions, cancellations, modifications)
- Database migration (008) for tracking booking history with JSONB fields
- Day details modal when clicking on calendar dates (replaces manual cleaning modal)
- Visual indicators for past dates (greyed out) in calendar views
- Prominent "TODAY" indicator with orange border and pill in calendar views
- Extension tracking with automatic detection during sync
- Cancellation tracking for bookings removed from Airbnb feed
- Completion status for past bookings

### Changed
- Calendar date clicks now show cleaning details instead of opening manual cleaning form
- List view now only shows upcoming cleanings (hides completed/past bookings)
- Sync logic preserves historical data instead of deleting past bookings
- Only future bookings are marked as cancelled when removed from Airbnb feed
- Past bookings are automatically marked as completed
- Extended getSchedule to include last 30 days of history
- Updated monthly/weekly views to display historical booking information

### Fixed
- TypeScript errors related to Next.js 15 breaking changes (Promise params)
- Headers API now properly awaits in Next.js 15
- Suspense boundary issues with useSearchParams
- Monthly calendar now displays all weeks (fixed height constraints)
- Sync no longer marks today's checkouts as cancelled
- Guest name storage (removed redundant "Guest" suffix)

### Removed
- Redundant "Guest" display in day details modal
- Test files causing build issues

### UI Improvements
- Past dates have grey background in calendar views
- Today's date has thick orange border and "TODAY" pill
- Completed bookings show with grey background
- Extended bookings show purple indicators
- Cancelled bookings show with reduced opacity
- Same-day turnarounds continue to show orange borders

### Technical Details
- Added modification_history JSONB field for audit trail
- Tracks original check-in/out dates for comparison
- Stores cancellation timestamps
- Counts and tracks extensions
- Preserves booking records for historical analysis