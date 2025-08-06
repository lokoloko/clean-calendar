# Cleaner Share Link Features

## Overview
The cleaner share link (`/cleaner/schedule/[token]`) provides a mobile-friendly, unauthenticated way for cleaners to view their schedule and submit feedback. No login required - cleaners access their personalized schedule through a secure token-based URL.

## Key Features

### 1. Auto-Refresh Functionality
- **Automatic Updates**: Schedule refreshes every 30 seconds when page is visible
- **Background Detection**: Refreshes immediately when returning to the page after switching apps
- **Manual Refresh**: Button available for immediate updates
- **Last Update Display**: Shows timestamp of last refresh (e.g., "Updated 2:30 PM")
- **Visual Feedback**: Spinning icon during refresh

### 2. Today's Cleanings List
- **Interactive Items**: Each cleaning is clickable with hover effect
- **Visual Hints**: Shows "Tap to provide feedback" for incomplete cleanings
- **Completion Status**: Green checkmark for completed cleanings
- **Key Information**:
  - Property name
  - Check-out time
  - Next check-in timing (Same day, Next day, etc.)

### 3. Feedback Submission Modal
Clicking on a cleaning opens a feedback form with:

- **Property Details**:
  - Property name
  - Address (if available)
  - Check-out time

- **Cleanliness Rating** (Required):
  - 😊 Clean - Property in excellent condition
  - 😐 Normal - Standard cleaning required
  - 😟 Dirty - Extra attention needed

- **Additional Notes** (Optional):
  - Free-text field for special conditions
  - Issues to report
  - Extra work performed

- **Submit Process**:
  - Loading state with spinner
  - Success toast notification
  - Schedule auto-refreshes to show completion
  - Modal closes automatically

### 4. Month View Click-to-Detail
- **Clickable Days**: Days with cleanings show cursor pointer on hover
- **Visual Indicators**: Hover effect on days with scheduled cleanings
- **Detail Modal Shows**:
  - All cleanings for selected day
  - Property name and address
  - Check-out times and guest names
  - Completion status
  - Same-day turnaround warnings
  - Previous cleanliness ratings
  - Next check-in timing

### 5. View Options
Three different views available via tabs:

- **Today**: Focus on current day's cleanings
- **Week**: 7-day calendar view with navigation
- **Month**: Full month calendar with clickable days

## Technical Implementation

### API Endpoints

#### Get Schedule
`GET /api/cleaner/schedule/[token]`
- Uses PostgreSQL RPC functions with SECURITY DEFINER
- Bypasses Row Level Security for unauthenticated access
- Returns cleaner info and full schedule

#### Submit Feedback
`POST /api/cleaner/schedule/[token]/feedback`
- Validates share token
- Verifies cleaning assignment
- Creates or updates feedback record
- Returns success confirmation

### Database Functions
PostgreSQL functions with SECURITY DEFINER:
- `get_cleaner_by_token(share_token)` - Returns cleaner details
- `get_cleaner_schedule_by_token(share_token)` - Returns schedule items

### Security
- Token-based authentication (32-character random tokens)
- Tokens have expiration dates
- No sensitive data exposed
- Read-only access except for feedback submission
- RPC functions ensure data isolation

## User Experience Flow

1. **Manager Creates Share Link**:
   - Goes to Cleaners page
   - Clicks share icon for a cleaner
   - Sets expiration (30, 60, 90 days, or never)
   - Copies generated link

2. **Cleaner Receives Link**:
   - Opens link on mobile device
   - Bookmarks for easy access
   - No login required

3. **Daily Use**:
   - Opens bookmarked link
   - Views today's cleanings
   - Taps cleaning to provide feedback
   - Submits rating and notes
   - Sees completion checkmark

4. **Schedule Stays Current**:
   - Auto-refreshes every 30 seconds
   - Shows last update time
   - Manual refresh available

## Mobile Optimization

- **Responsive Design**: Edge-to-edge layout on mobile
- **Touch-Friendly**: Large tap targets for all interactive elements
- **Minimal Scrolling**: Important info visible without scrolling
- **Fast Loading**: Optimized queries and caching
- **Offline Friendly**: Works when switching between apps

## Benefits

### For Cleaners
- No app installation required
- No password to remember
- Works on any device with a browser
- Simple, intuitive interface
- Quick feedback submission

### for Managers
- Easy distribution (just share a link)
- Control expiration dates
- Track feedback completion
- No cleaner account management
- Reduced support requests

## Future Enhancements
- Push notifications for schedule changes
- Photo upload for feedback
- Offline mode with sync
- Multi-language support
- Time tracking integration