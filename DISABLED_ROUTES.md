# Disabled API Routes Documentation

This document tracks API routes that were disabled due to Edge Runtime incompatibility. These routes use raw SQL queries (`db.query()`) which don't work in Vercel's Edge Runtime.

## Summary

**Total Disabled Routes**: 15  
**Reason**: Raw SQL queries incompatible with Edge Runtime  
**Solution**: Add methods to `db-edge.ts` using Supabase client

## High Priority Routes (Critical Functionality)

### 1. Automated Calendar Sync
**Route**: `/api/cron/sync-all/route.ts.disabled`  
**Purpose**: Automated sync of all calendar data via cron job  
**Used By**: Vercel cron jobs (scheduled every 3 hours)  
**Fix Required**: 
- Add `syncAllListings()` method to db-edge
- Convert raw SQL queries to Supabase queries
- Maintain transaction consistency

### 2. Manual Sync All
**Route**: `/api/sync-all/route.ts.disabled`  
**Purpose**: Manual trigger to sync all calendars  
**Used By**: Dashboard "Sync All" button  
**Fix Required**: Similar to cron sync route

### 3. Manual Schedule Generation
**Routes**: 
- `/api/manual-schedules/[id]/generate/route.ts.disabled`
- `/api/manual-schedules/[id]/regenerate/route.ts.disabled`

**Purpose**: Generate schedule items from manual schedule rules  
**Used By**: Manual scheduling feature  
**Fix Required**:
- Add `generateScheduleItems()` method
- Add `deleteScheduleItemsByRule()` method
- Handle recurrence patterns

## Medium Priority Routes (Additional Features)

### 4. Individual Listing Operations
**Route**: `/api/listings/[id]/route.ts.disabled`  
**Purpose**: GET/PUT/DELETE individual listings  
**Current Status**: Partially replaced by other routes  
**Fix Required**: 
- The GET is already covered by `db.getListing()`
- Need to fix PUT operation (has raw SQL for checking changes)
- DELETE operation needs proper cascade handling

### 5. Listing Relationships
**Routes**:
- `/api/listings/[id]/assignments/route.ts.disabled` - Get cleaners assigned to listing
- `/api/listings/[id]/cleanings/route.ts.disabled` - Get cleaning history
- `/api/listings/[id]/feedback/stats/route.ts.disabled` - Get feedback statistics

**Fix Required**: Add relationship methods to db-edge

### 6. Manual Schedule CRUD
**Routes**:
- `/api/manual-schedules/route.ts.disabled` - List/Create manual schedules
- `/api/manual-schedules/[id]/route.ts.disabled` - Update/Delete
- `/api/manual-schedules/cleanup/route.ts.disabled` - Remove orphaned items
- `/api/manual-schedules/one-time/route.ts.disabled` - One-time cleanings

**Fix Required**: Complete manual scheduling system in db-edge

## Low Priority Routes

### 7. Analytics
**Route**: `/api/stats/cancellations/route.ts.disabled`  
**Purpose**: Track cancelled bookings  
**Fix Required**: Add cancellation tracking to db-edge

### 8. Schedule Operations
**Routes**:
- `/api/schedule/[id]/route.ts.disabled` - Individual schedule item operations
- `/api/schedule/share/route.ts.disabled` - Create share links

**Fix Required**: Add schedule item methods to db-edge

## Implementation Guide

### Step 1: Extend db-edge.ts
Add these methods to `src/lib/db-edge.ts`:

```typescript
// User Settings
async getUserSettings(userId: string)
async updateUserSettings(userId: string, settings: any)

// Manual Schedules
async getManualScheduleRules(userId: string)
async createManualScheduleRule(data: any)
async updateManualScheduleRule(id: string, userId: string, data: any)
async deleteManualScheduleRule(id: string, userId: string)
async generateScheduleItems(ruleId: string, userId: string)

// Sync Operations
async syncListing(listingId: string, userId: string)
async syncAllListings(userId: string)

// Relationships
async getListingAssignments(listingId: string, userId: string)
async getListingCleanings(listingId: string, userId: string)
async getListingFeedbackStats(listingId: string, userId: string)
```

### Step 2: Convert Routes
1. Copy the disabled route
2. Replace `db.query()` calls with new db-edge methods
3. Test thoroughly
4. Remove `.disabled` extension

### Step 3: Testing
- Test each route individually
- Verify Edge Runtime compatibility
- Check error handling
- Ensure proper authorization

## Notes

- All routes already use `@/lib/db-edge` import (good!)
- Authentication is properly implemented
- Main issue is just the raw SQL queries
- Some routes might be replaced by better implementations rather than fixed

## Priority Order for Implementation

1. **Sync Routes** (cron and manual) - Essential for automation
2. **Manual Schedule Generation** - Completes existing feature
3. **Individual Listing Operations** - Enhances current functionality
4. **Manual Schedule CRUD** - Full feature completion
5. **Analytics & Relationships** - Nice to have

Last Updated: 2025-08-02