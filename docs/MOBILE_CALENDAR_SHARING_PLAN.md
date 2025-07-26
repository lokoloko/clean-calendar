# Mobile-First Calendar Sharing for Cleaners - Implementation Plan

## Overview
This plan outlines the implementation of a mobile-first calendar sharing system for cleaners, using the same technologies and frameworks already in the project.

## Technology Stack (Existing)
- **CSS Framework**: Tailwind CSS with responsive utilities
- **UI Components**: shadcn/ui (Radix UI based components)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **State Management**: React hooks
- **Mobile Detection**: Custom useIsMobile() hook

## Phase 1: Core Mobile Components

### 1.1 Mobile-First Schedule Views
- **List View**: Transform table into mobile cards
  - Use Card components from shadcn/ui
  - Stack cards vertically on mobile
  - Include all essential info in each card
  - Add swipe gestures for actions

- **Week View**: Create agenda-style layout
  - Group by day with collapsible sections
  - Use Accordion component for expandable days
  - Show time-based vertical timeline
  - Highlight same-day turnarounds

- **Month View**: Simplified calendar
  - Larger touch targets (min 44px)
  - Show count badges instead of full details
  - Use Popover for day details
  - Bottom sheet pattern for mobile

### 1.2 Navigation Improvements
- Replace tabs with segmented control on mobile
- Add swipe gestures between views
- Sticky header with view switcher
- Use Sheet component for mobile menu

## Phase 2: Cleaner-Specific Features

### 2.1 Cleaner Share Interface
- Add "Share My Calendar" button in cleaner dashboard
- Simple date range selector using Calendar component
- Generate shareable link with cleaner context
- QR code generation for easy sharing

### 2.2 Enhanced Share View
- Mobile-optimized public share page
- Default to list view on mobile
- Progressive disclosure of details
- One-tap add to calendar (ICS export)

### 2.3 Security & Permissions
- Validate cleaner can only share their assignments
- Add cleaner identification to shares
- Track share creation and usage
- Implement share expiration

## Phase 3: Mobile UX Enhancements

### 3.1 Touch Optimizations
- Increase all touch targets to 44x44px minimum
- Add proper spacing (8px minimum between targets)
- Implement pull-to-refresh
- Add haptic feedback where supported

### 3.2 Mobile-Specific Interactions
- Bottom sheets for forms (using Dialog with custom styling)
- Floating action button for primary actions
- Swipe actions on list items
- Long-press for context menus

### 3.3 Performance
- Virtualized lists for long schedules
- Lazy loading of calendar data
- Optimistic UI updates
- Offline support with service workers

## Phase 4: Implementation Details

### 4.1 File Structure
```
/src/components/cleaner/
  - share-calendar.tsx
  - mobile-schedule-views/
    - mobile-list-view.tsx
    - mobile-week-view.tsx
    - mobile-month-view.tsx
  - mobile-navigation.tsx

/src/app/cleaner/share/
  - page.tsx (share management)

/src/app/share/cleaner/[token]/
  - page.tsx (public share view)
```

### 4.2 API Endpoints
- `POST /api/cleaner/share` - Create share token
- `GET /api/cleaner/share` - List cleaner's shares
- `DELETE /api/cleaner/share/[id]` - Revoke share

### 4.3 Database Updates
- Extend share_tokens table with cleaner context
- Add cleaner_id foreign key
- Add share type enum (full/cleaner-specific)

## Phase 5: Testing & Deployment

### 5.1 Testing Strategy
- Mobile device testing on iOS/Android
- Responsive design testing (320px to 768px)
- Touch interaction testing
- Performance testing on slower devices

### 5.2 Progressive Enhancement
- Ensure desktop experience remains unchanged
- Graceful degradation for older browsers
- Feature detection for advanced interactions

## Implementation Priority
1. Mobile-optimized list view (most used)
2. Share calendar functionality
3. Week view mobile optimization
4. Month view improvements
5. Advanced mobile interactions

## Success Metrics
- Page load time < 3s on 3G
- Touch target success rate > 95%
- Share link generation < 1s
- Mobile user satisfaction improvement

## Notes
- All implementations use existing frameworks (Tailwind, shadcn/ui)
- No new dependencies required
- Progressive enhancement approach
- Backwards compatible with existing features