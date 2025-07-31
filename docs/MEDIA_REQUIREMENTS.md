# Media Requirements for GoStudioM Scheduler

## Overview
This document outlines the screenshots, videos, and other media needed to replace placeholder images on the landing page.

## Current Placeholder Locations

### 1. Hero Section (600x400px)
**Location**: `src/app/page.tsx` line 230
**Current**: Placeholder image
**Recommended Content**:
- **Option A - Video (Preferred)**: 
  - 30-45 second demo video showing:
    - Pasting an Airbnb calendar link
    - Instant schedule generation
    - Clean, modern UI of the dashboard
  - Auto-play, muted, looped
  - Fallback to static image

- **Option B - Screenshot**:
  - Dashboard view showing weekly schedule
  - Multiple properties with cleaner assignments
  - Clean, populated with realistic data
  - Show both desktop and mobile views

### 2. Benefits Section (600x500px)
**Location**: `src/app/page.tsx` line 440
**Current**: Placeholder image
**Recommended Content**:
- **Screenshot Options**:
  1. Split view showing "before" (messy spreadsheet) vs "after" (clean dashboard)
  2. Mobile cleaner portal showing today's cleanings
  3. Calendar sync visualization showing Airbnb → GoStudioM flow
  4. Notification examples (SMS/Email mockups)

## Additional Media Opportunities

### 3. Testimonial Section Enhancement
Consider adding:
- Host profile photos (can use avatars/illustrations)
- Property photos (blurred backgrounds)

### 4. How It Works Section
Could benefit from:
- Small icons or mini-screenshots for each step
- Animated GIF showing the 3-step process

## Video Implementation Guide

To add a video in place of the hero image:

```jsx
// Replace the Image component with:
<div className="relative rounded-xl overflow-hidden shadow-lg">
  <video
    autoPlay
    muted
    loop
    playsInline
    className="w-full h-full object-cover"
    poster="/images/hero-poster.jpg" // Fallback image
  >
    <source src="/videos/demo.mp4" type="video/mp4" />
    <source src="/videos/demo.webm" type="video/webm" />
    {/* Fallback for browsers that don't support video */}
    <Image
      src="/images/hero-screenshot.png"
      width={600}
      height={400}
      alt="GoStudioM Dashboard Demo"
    />
  </video>
</div>
```

## Screenshot Guidelines

### Dashboard Screenshots
- Use realistic property names (e.g., "Sunset Beach Condo", "Mountain View Cabin")
- Show 3-5 properties with varying cleaning schedules
- Include cleaner names that reflect diversity
- Display both upcoming and completed cleanings
- Ensure mobile responsiveness is visible

### Data to Include
- Realistic check-in/check-out times (10 AM - 4 PM typical)
- Mix of same-day turnovers and next-day cleanings
- At least one "urgent" or "today" cleaning
- Feedback ratings visible (mostly positive)

### Styling Consistency
- Maintain current brand colors (teal primary, orange accent)
- Clean, uncluttered interface
- Good contrast for accessibility
- No sensitive information visible

## Production Checklist
- [ ] Hero section video/screenshot (600x400)
- [ ] Benefits section screenshot (600x500)
- [ ] Mobile cleaner portal screenshot
- [ ] Dashboard list view screenshot
- [ ] Calendar sync flow diagram
- [ ] Email/SMS notification examples
- [ ] Logo files (SVG preferred)

## File Organization
```
public/
├── images/
│   ├── hero-screenshot.png
│   ├── hero-poster.jpg
│   ├── benefits-split-view.png
│   ├── mobile-cleaner-portal.png
│   └── dashboard-views/
│       ├── list-view.png
│       ├── calendar-view.png
│       └── mobile-view.png
└── videos/
    ├── demo.mp4
    └── demo.webm
```