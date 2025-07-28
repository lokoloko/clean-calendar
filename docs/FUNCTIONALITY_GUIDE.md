# CleanSweep Scheduler - Complete Functionality Guide

Last Updated: January 2025

## Table of Contents
- [Overview](#overview)
- [User Roles](#user-roles)
- [Admin/Manager Features](#adminmanager-features)
- [Cleaner Features](#cleaner-features)
- [Public Features](#public-features)
- [Integration Features](#integration-features)
- [Recent Additions](#recent-additions)

## Overview

CleanSweep Scheduler is a comprehensive cleaning management system designed for Airbnb hosts to automate and optimize their property cleaning operations. The application handles everything from calendar synchronization to cleaner assignments and quality tracking.

## User Roles

### 1. Admin/Manager
- Full access to all features
- Manages properties, cleaners, and schedules
- Views analytics and reports
- Configures system settings

### 2. Cleaner
- Mobile-optimized portal access
- Views assigned cleanings
- Submits feedback and completion status
- Manages personal schedule

### 3. Public/Shared Access
- Read-only schedule viewing
- Limited by share token permissions
- No management capabilities

## Admin/Manager Features

### 📊 Dashboard (`/dashboard`)
**Purpose**: Operational command center with real-time metrics and actionable insights

**Features**:
- **Key Metrics Cards**:
  - Total Listings
  - Active Cleaners
  - Upcoming Cleanings (7-day window)
  - Monthly Cleaning Costs
- **Today's Cleanings Section**:
  - List of all cleanings scheduled for today
  - Cleaner assignments and status
  - Visual indicators for unassigned cleanings
- **Needs Attention Section**:
  - Unassigned cleanings requiring action
  - Same-day turnovers needing coordination
  - Overdue cleanings
- **Recent Activity Feed**:
  - Cleaner feedback submissions
  - Calendar synchronizations
  - Assignment changes
  - Cleaning completions
- **Quick Actions**:
  - Add Property
  - Add Cleaner
  - Add Manual Cleaning
  - Manage Assignments
- **Sync All Button**: One-click calendar synchronization for all properties

### 🏠 Listings Management (`/listings`)
**Purpose**: Manage all properties and their calendar integrations

**Features**:
- **Property List View**:
  - Property name and details (click to view details)
  - Cleaning fee configuration
  - Active/Inactive status on Airbnb
  - Last sync timestamp
  - Individual sync buttons
- **Add New Property**:
  - Property name
  - Airbnb iCal URL
  - Cleaning fee
  - Timezone selection
  - Active status toggle
- **Edit Property**:
  - Update all property details
  - Change calendar URL
  - Adjust cleaning fee
  - Toggle active status
- **Delete Property**:
  - Remove property and associated data
  - Confirmation required
- **Calendar Sync**:
  - Manual sync per property
  - Automatic sync tracking
  - Error handling and notifications

### 🏠 Listing Details (`/listings/[id]`)
**Purpose**: View detailed information and feedback for a specific property

**Features**:
- **Overview Cards**:
  - Cleaning fee amount
  - Assigned cleaners count
  - Property timezone
  - Calendar sync status
- **Cleanliness Feedback Section**:
  - Feedback coverage percentage with progress bar
  - Rating breakdown (Clean/Normal/Dirty) with counts
  - Visual percentage display for each rating
  - Emoji indicators for ratings
- **Recent Cleanings Tab**:
  - Last 10 cleanings with dates
  - Cleaner assignments
  - Guest names
  - Status badges
  - Visual feedback indicators
- **Settings Tab**:
  - Property ID display
  - Creation date
  - Calendar URL reference

### 👥 Cleaners Management (`/cleaners`)
**Purpose**: Maintain cleaner directory and contact information

**Features**:
- **Cleaner Directory**:
  - Name, phone, and email
  - Assignment count
  - Quick edit capabilities
- **Add New Cleaner**:
  - Name (required)
  - Phone number (for SMS authentication)
  - Email address
- **Edit Cleaner**:
  - Update contact information
  - Maintain assignment relationships
- **Delete Cleaner**:
  - Remove cleaner (with confirmation)
  - Handle existing assignments

### 🔗 Assignments (`/assignments`)
**Purpose**: Link cleaners to specific properties

**Features**:
- **Assignment Matrix**:
  - Properties vs Cleaners grid
  - Visual assignment status
  - Quick assignment changes
- **Create Assignment**:
  - Select property
  - Select cleaner
  - Auto-assignment to future cleanings
- **Remove Assignment**:
  - Unlink cleaner from property
  - Handle future cleaning reassignments

### 📅 Schedule Management (`/schedule`)
**Purpose**: Comprehensive cleaning schedule visualization and management

**Features**:
- **Multiple View Modes**:
  - **List View**: Chronological list with all details
  - **Weekly View**: 7-day calendar grid
  - **Monthly View**: Full month calendar
- **Advanced Filtering**:
  - By cleaner (single selection)
  - By properties (multi-select with checkboxes)
  - By date (calendar picker)
  - Show/hide cancelled bookings
- **Schedule Item Details**:
  - Checkout date and time
  - Next check-in information
  - Property name with badges (Manual/Recurring/Extended)
  - Cleaner assignment with phone
  - Status (Pending/Confirmed/Completed/Cancelled)
  - **Feedback Column** (New):
    - Visual cleanliness rating
    - Hover to see notes
- **Manual Cleaning Addition**:
  - One-time cleaning
  - Property selection
  - Date and time
  - Notes field
- **Cleaner Reassignment**:
  - Change assigned cleaner
  - Available for pending/confirmed cleanings
  - Modal interface
- **Export Functionality**:
  - Text-based export for cleaners
  - Customizable date range
  - Cleaner-specific schedules
  - Copy to clipboard
- **Print Support**:
  - Optimized print layout
  - Current view printing
- **Share Schedule**:
  - Generate secure share links
  - Configure permissions (cleaner, properties, dates)
  - Set expiration period
  - Track link usage

### 📋 Manual Schedules (`/manual-schedules`)
**Purpose**: Manage recurring cleaning schedules for non-Airbnb properties

**Features**:
- **Schedule Types**:
  - One-time cleanings
  - Recurring cleanings
- **Frequency Options**:
  - Daily
  - Weekly (with day selection)
  - Biweekly
  - Monthly (specific day)
  - Custom interval
- **Schedule Management**:
  - Create new schedules
  - Edit existing schedules
  - **Regeneration** (New):
    - Detect frequency changes
    - Prompt to regenerate items
    - Delete old items and create new
  - Activate/Deactivate schedules
  - Delete schedules (removes all items)
- **Generation Controls**:
  - Generate button for new items
  - **Regenerate button** for updates
  - Conflict detection
  - Date range configuration

### 💬 Feedback Management (`/feedback`) - NEW
**Purpose**: View and analyze cleaner feedback on property conditions

**Features**:
- **Statistics Overview**:
  - Total cleanings count
  - Breakdown by rating (Clean/Normal/Dirty)
  - Percentage calculations
  - Visual indicators with icons
- **Advanced Filtering**:
  - Date range picker with presets
  - Property selection
  - Cleaner selection
  - Rating filter
- **Feedback Table**:
  - Date of cleaning
  - Property name
  - Cleaner name
  - Visual rating display
  - Feedback notes
- **Export Functionality**:
  - CSV export
  - Filtered data export
  - Timestamp included

### 📈 Statistics (`/stats`)
**Purpose**: Analytics and performance insights

**Features**:
- **Time Period Selection**:
  - This week/month/year
  - Custom date ranges
- **Metrics Display**:
  - Total cleanings
  - Unique properties cleaned
  - Average cleanings per day
  - Busiest day analysis
- **Charts and Graphs**:
  - Cleaning trends
  - Property distribution
  - Cleaner workload
- **Cleanliness Feedback Section**:
  - Pie chart visualization of rating distribution
  - Average rating display with trend indicator
  - Feedback coverage statistics
  - Month-over-month trend comparison
  - Visual rating breakdown with emoji indicators

### ⚙️ Settings (`/settings`)
**Purpose**: System configuration and preferences

**Features**:
- **Sync Configuration**:
  - Auto-sync toggle
  - Sync frequency
  - Sync time preferences
- **Notification Settings**:
  - Email notifications
  - SMS settings (future)
- **System Preferences**:
  - Default timezone
  - Date format
  - Language (future)

## Cleaner Features

### 📱 Mobile Login (`/cleaner`)
**Purpose**: Secure authentication for cleaners

**Features**:
- Phone number input
- SMS code verification (mock in dev)
- Remember device (30 days)
- Mobile-optimized interface

### 🏠 Cleaner Dashboard (`/cleaner/dashboard`)
**Purpose**: Mobile-first view of assigned cleanings

**Features**:
- **Today's Summary**:
  - Cleanings count
  - Completion progress bar
  - Visual indicators for pending items
- **Time Filters**:
  - Today (default)
  - This Week
  - All Time
- **Cleaning Cards**:
  - Property name and checkout time
  - Visual status indicators
  - Tap to view details
  - Orange ring for incomplete items
  - Pulsing dot for items needing action

### 🧹 Cleaning Details (`/cleaner/cleaning/[id]`)
**Purpose**: Individual cleaning management and feedback

**Features**:
- **Property Information**:
  - Name and location
  - Checkout date and time
  - Guest name (if available)
  - Booking source badge
- **Feedback Submission**:
  - Cleanliness rating selection:
    - 😊 Clean - Ready for next guest
    - 😐 Normal - Standard cleaning needed
    - 😟 Dirty - Extra attention required
  - Optional notes field
  - Complete Cleaning button
- **Completion Status**:
  - Visual confirmation
  - Timestamp display
  - Submitted feedback summary

## Public Features

### 🔗 Shared Schedule (`/share/[token]`)
**Purpose**: Public access to filtered schedule views

**Features**:
- **Token-Based Access**:
  - Secure unique URLs
  - Configurable permissions
  - Expiration dates
- **Filtered Views**:
  - By specific cleaner
  - By property selection
  - By date range
- **Read-Only Display**:
  - List view of cleanings
  - No management capabilities
  - Mobile-responsive design

## Integration Features

### 📅 Airbnb Calendar Sync
**How it works**:
1. Parses iCal feed from Airbnb
2. Extracts booking information
3. Creates cleaning schedule items
4. Handles updates and cancellations
5. Tracks modifications

**Features**:
- Automatic conflict resolution
- Cancellation detection
- Extension tracking
- Historical preservation

### 📱 SMS Authentication (Production)
**Current Status**: Mock implementation in development

**Planned Features**:
- Twilio integration
- Real SMS delivery
- Code verification
- Session management

### 📧 Export Capabilities
**Available Formats**:
- Text export for cleaner schedules
- CSV export for feedback data
- Print-optimized layouts
- Clipboard copying

### 🏠 Calendar Preview (Landing Page)
**Purpose**: Allow potential users to preview the value before signing up

**Features**:
- Airbnb calendar URL input
- Real-time validation
- Preview of cleaning schedule
- Same-day turnover highlighting
- Call-to-action for sign-up

## Recent Additions

### January 2025 Updates

#### Manual Schedule Regeneration
- **Problem Solved**: Editing frequency didn't update existing schedule items
- **New Features**:
  - Automatic detection of frequency changes
  - Regeneration prompt after edits
  - Explicit Regenerate button
  - Proper cleanup of old items

#### Cleaner Feedback System
- **Problem Solved**: No visibility into property conditions
- **New Features**:
  - Visual feedback column in schedule
  - Comprehensive feedback page
  - Statistical analysis
  - Export capabilities
  - Dashboard integration

#### Multi-Property Filtering
- **Problem Solved**: Could only filter by one property at a time
- **New Features**:
  - Checkbox selection for multiple properties
  - Persistent filter state
  - Visual selection indicators

#### Dashboard Enhancements
- **Problem Solved**: Dashboard was static and not actionable
- **New Features**:
  - Today's Cleanings section
  - Needs Attention alerts
  - Recent Activity feed
  - Quick Action buttons
  - Changed "Revenue" to "Cleaning Costs"

## Feature Availability Matrix

| Feature | Admin | Cleaner | Public |
|---------|-------|---------|---------|
| View Dashboard | ✅ | ❌ | ❌ |
| Manage Properties | ✅ | ❌ | ❌ |
| Manage Cleaners | ✅ | ❌ | ❌ |
| View Full Schedule | ✅ | ❌ | ❌ |
| View Assigned Schedule | ❌ | ✅ | ❌ |
| Submit Feedback | ❌ | ✅ | ❌ |
| Export Data | ✅ | ❌ | ❌ |
| View Shared Schedule | ✅ | ✅ | ✅ |
| Calendar Sync | ✅ | ❌ | ❌ |
| View Statistics | ✅ | ❌ | ❌ |
| Configure Settings | ✅ | ❌ | ❌ |

## Mobile vs Desktop Capabilities

### Mobile Optimized
- Cleaner portal (all pages)
- Shared schedule view
- Dashboard metrics
- Quick actions

### Desktop Optimized
- Schedule calendar views
- Statistics charts
- Multi-column layouts
- Bulk operations

### Responsive (Both)
- List views
- Forms
- Navigation
- Modals

## Business Logic Highlights

### Automatic Cleaner Assignment
- Based on property-cleaner assignments
- Applies to new bookings from sync
- Manual cleanings respect assignments
- Can be overridden per cleaning

### Same-Day Turnover Detection
- Automatically identifies tight turnarounds
- Visual warnings in schedule
- Included in Needs Attention alerts
- Highlighted in calendar preview

### Conflict Prevention
- Prevents double-booking cleaners
- Warns about scheduling conflicts
- Handles recurring schedule overlaps
- Preserves historical data

### Data Integrity
- Soft deletes for historical tracking
- Modification history preservation
- Cancellation tracking
- Extension monitoring

## Security Features

### Authentication
- Dev mode for testing
- Production Supabase Auth
- Google OAuth integration
- SMS verification for cleaners

### Authorization
- Role-based access control
- Property-based filtering
- Cleaner-specific views
- Token-based sharing

### Data Protection
- Row-level security (RLS)
- Secure token generation
- Session management
- HTTPS required in production