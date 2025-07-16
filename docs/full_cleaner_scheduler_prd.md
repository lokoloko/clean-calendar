# 🧼 Airbnb Cleaner Scheduler – Unified PRD + UI Documentation

This document includes the product vision, all UI-only Firebase Studio components, additional feature plans, and developer commenting instructions for future backend integration.

---

## ✅ Product Purpose

Automate cleaning schedules for Airbnb hosts by turning .ics calendar links into structured schedules and daily messages. Help hosts assign cleaners, avoid missed turnovers, and reduce manual coordination.

---

## ⚙️ Tech Stack

- **Frontend**: Firebase Studio (UI-only for now)
- **Authentication**: Google OAuth
- **Data Input**: Airbnb .ics calendar links
- **Messaging (future)**: SMS/WhatsApp (via Twilio), Email
- **Charts**: Static/placeholder (Firebase Studio-compatible)

---

## 🧩 Firebase Studio UI Overview (UI-Only)

### 🏠 Landing Page

**Sections**:
- Hero CTA: Paste Airbnb .ics link → Generate Schedule
- How It Works (3 steps)
- Benefits List
- Pricing Teaser
- Testimonials (optional)

---

### 💵 Pricing Page

**Plans**:
- Free: 1 listing, email only
- Starter ($9/mo): 3 listings, SMS
- Pro ($29/mo): 10+ listings, WhatsApp, auto-assign

**Design**: 3-column card layout with "Most Popular" tag

---

### 📬 Add Listing Form

**Fields**:
- Listing Name (e.g., Unit 2 – Hopper)
- Airbnb Calendar (.ics) URL
- Assigned Cleaner (dropdown)
- Notes: Manually labeled; .ics does not include listing name

---

### 📊 Stats Page

**UI Components**:
- Occupancy Rate (card)
- Average Stay Length
- Back-to-Back Turnovers
- Checkout Day Histogram
- Weekly Trends (line chart)
- Heatmap (booking density)
- Booking Table (UID, dates)

**Selector**: Dropdown to switch between listings

---

### 🧍 Cleaners Management Page

**Fields**:
- Name, phone, email
- Assigned listings
- Add/Edit via modal
- View as table

---

### 🗂️ Listings Page

- Show all connected listings
- View/edit cleaner and .ics
- Last sync timestamp
- Manual refresh button

---

### 📅 Schedule Viewer

- Table view by date/cleaner
- Optional: calendar grid
- Filter by cleaner/listing
- Export: PDF, CSV, Share link

---

### ⚙️ Notification Settings

- Time of daily message
- Preferred method (SMS, Email, WhatsApp)
- Per-cleaner opt-in table

---

### 🧪 Test Mode / Demo Data

- Button to load sample bookings
- Lets users explore Stats/Schedule before syncing real Airbnb link

---

## 🔁 Reusable Modal Components

- Add/Edit Listing
- Add/Edit Cleaner
- Assign Cleaner to Listing

> Use consistent padding, spacing, and button layout

---

## 🧠 AI-Powered Scheduler (Future Feature)

- Predict cleaning duration by stay length
- Auto-assign cleaner by load
- Warn for back-to-backs
- Detect anomalies (late checkout, overlaps)
- Smart rotation & checklist generation

---

## 🛠️ Developer Instructions – Commenting Prompt

Use the following structure in Firebase Studio to document each section:

```plaintext
// Hero section – CTA to generate schedule from calendar
// Reusable StatCard for top metrics
// ListingsTable – admin view of all synced listings
// CleanerProfilePage – show tasks for selected cleaner
// TODO: Hook .ics parser to replace mock data
```

Label:
- Page structure
- Modal functions
- Placeholder logic
- Future hooks (e.g., messaging, sync)

---

## 📌 Final Notes

- All components are UI-only
- Use mock data to simulate functionality
- Firebase Studio project should be structured with clear section-level commenting and modularity
- Future features (AI, SMS) to be phased in after UI is validated

---