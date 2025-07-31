# Inventory & Supplies Tracker - Product Specification

## Overview
An integrated supplies tracking system where cleaning crews update inventory during each clean, providing hosts with real-time alerts, usage analytics, and automated reordering capabilities.

## Core Concept
Cleaning crews check supplies during each visit → Real-time updates to hosts → Automated reordering → Never run out of essentials

## Problem Statement
- Hosts discover empty supplies through guest complaints
- No visibility into supply usage rates
- Manual inventory checks are time-consuming
- Difficult to track costs across multiple properties
- Items go missing without accountability

## Integration with Cleaning App

### Cleaner Workflow
```
Cleaning Visit Flow:
1. Cleaner arrives → Opens cleaning task
2. Clean property → Check supplies checklist
3. Update quantities → Flag issues
4. Complete clean → Inventory synced to host
```

### Mobile Interface for Cleaners
```
┌─────────────────────────┐
│ Unit A - Supply Check   │
├─────────────────────────┤
│ Bathroom                │
│ ├─ Toilet Paper  [2] ⚠️ │
│ ├─ Hand Soap     [3] ✓  │
│ ├─ Towels        [6] ✓  │
│                         │
│ Kitchen                 │
│ ├─ Coffee Pods   [0] 🚨 │
│ ├─ Dish Soap     [1] ⚠️ │
│                         │
│ Missing Items:          │
│ ├─ Hair Dryer      [!]  │
│ └─ TV Remote       [!]  │
└─────────────────────────┘
```

## Key Features

### 1. Smart Supply Lists

#### Categories
- **Essentials**: Toilet paper, paper towels, soap
- **Kitchen**: Coffee, tea, condiments, dishwasher pods
- **Bathroom**: Shampoo, body wash, towels
- **Bedroom**: Extra linens, pillows
- **Safety**: First aid, fire extinguisher, batteries
- **Electronics**: Remotes, chargers, batteries
- **Custom Items**: Host-specific additions

### 2. Real-Time Alerts
- Low supply warnings
- Missing item notifications
- Unusual usage patterns
- Reorder reminders

### 3. Auto-Reorder System
- Set minimum quantities
- Preferred vendor selection
- Bulk ordering across properties
- Budget controls

### 4. Analytics Dashboard
- Cost per stay
- Usage trends
- Loss prevention tracking
- Vendor performance
- Property comparisons

## Technical Implementation

### Database Schema

```sql
-- Supply master list
CREATE TABLE supplies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit_of_measure TEXT,
  reorder_point INTEGER,
  reorder_quantity INTEGER,
  preferred_vendor TEXT,
  avg_cost_per_unit DECIMAL,
  barcode TEXT,
  image_url TEXT
);

-- Inventory levels per property
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  property_id UUID,
  supply_id UUID,
  current_quantity INTEGER,
  last_updated TIMESTAMP,
  updated_by UUID, -- cleaner who updated
  min_quantity INTEGER,
  max_quantity INTEGER,
  location TEXT -- "Master bathroom", "Kitchen cabinet"
);

-- Supply check during cleaning
CREATE TABLE cleaning_supply_checks (
  id UUID PRIMARY KEY,
  cleaning_id UUID, -- links to cleaning job
  supply_id UUID,
  quantity_before INTEGER,
  quantity_after INTEGER,
  notes TEXT,
  photo_url TEXT,
  checked_at TIMESTAMP
);

-- Missing/damaged items
CREATE TABLE missing_items (
  id UUID PRIMARY KEY,
  property_id UUID,
  item_name TEXT,
  reported_by UUID,
  reported_date TIMESTAMP,
  guest_reservation_id TEXT,
  replacement_cost DECIMAL,
  status TEXT, -- 'reported', 'confirmed', 'replaced', 'charged'
  resolution_notes TEXT
);

-- Reorder history
CREATE TABLE reorder_history (
  id UUID PRIMARY KEY,
  property_id UUID,
  supply_id UUID,
  quantity_ordered INTEGER,
  total_cost DECIMAL,
  vendor TEXT,
  order_date TIMESTAMP,
  received_date TIMESTAMP
);
```

## Features by User Type

### For Cleaning Crews
- Quick quantity updates (number picker)
- Photo evidence for issues
- Barcode scanning (future)
- Offline mode with sync
- Supply location guide

### For Hosts
- Real-time inventory levels
- Cost analytics
- Automated purchase links
- Multi-property overview
- Loss prevention reports
- Vendor management

### For Property Managers
- Bulk ordering across properties
- Team performance metrics
- Budget controls
- Custom approval workflows
- API integrations

## Smart Features

### 1. Predictive Ordering
```javascript
// Based on:
- Historical usage rates
- Upcoming bookings
- Seasonal patterns
- Guest count

"You'll need 48 rolls of toilet paper for next month's 
23 bookings (2.1 rolls per stay average)"
```

### 2. Cost Optimization
- Track cost per guest
- Identify expensive items
- Suggest bulk buying
- Compare vendor prices
- ROI on amenity upgrades

### 3. Loss Prevention
- Track items by guest stay
- Pattern recognition for theft
- Automatic security deposit claims
- Photo documentation

### 4. Smart Notifications
- "Coffee running low at Unit A (2 days left)"
- "Unusual usage: 10 towels used in 2-night stay"
- "Save $40 by bulk ordering toilet paper now"

## Pricing Model

### Integrated with Cleaning App
- **Basic**: Included (manual counts only)
- **Smart** (+$5/mo): Auto-reorder, analytics
- **Pro** (+$10/mo): Multi-property, API, predictions

### Standalone App
- **Starter** ($9/mo): Up to 3 properties
- **Growth** ($19/mo): Up to 10 properties
- **Scale** ($39/mo): Unlimited properties

## Revenue Opportunities

### 1. SaaS Subscriptions
- Monthly recurring revenue
- Tiered by property count
- Feature-based upgrades

### 2. Affiliate Commissions
- Amazon Business partnership
- Costco/Sam's Club
- Vacation rental suppliers
- 3-5% commission average

### 3. Bulk Buying Network
- Negotiate group discounts
- Charge small markup
- Exclusive supplier deals

### 4. Verified Vendor Program
- Suppliers pay for preferred status
- Featured placement
- Performance analytics

## Implementation Phases

### Phase 1: MVP (Month 1)
- Basic supply checklist in cleaning app
- Manual quantity updates
- Low supply alerts
- Simple reporting

### Phase 2: Smart Features (Month 2)
- Auto-reorder links
- Cost tracking
- Photo uploads
- Missing item reports

### Phase 3: Automation (Month 3)
- Predictive ordering
- Vendor integration
- Bulk ordering
- Advanced analytics

### Phase 4: Scale (Month 4+)
- Barcode scanning
- API integrations
- White label options
- Marketplace features

## Success Metrics
- Properties never out of essentials: >95%
- Time saved per property: 3-5 hours/month
- Cost reduction through bulk buying: 15-20%
- Missing item recovery rate: >70%
- User retention: >90%

## Competitive Advantages
1. **Integrated with Cleaning**: Natural touchpoint
2. **Real-time Updates**: Not monthly manual checks
3. **Predictive**: Prevents outages before they happen
4. **Cost Tracking**: True cost per stay visibility
5. **Loss Prevention**: Accountability system

## Sample Analytics View
```
SUPPLIES DASHBOARD - March 2024

📊 Overview:
- Total Spend: $847
- Cost per Stay: $12.34
- Items Tracked: 47
- Reorders Needed: 3

⚠️ Attention Needed:
- Unit A: Coffee pods empty
- Unit C: 1 towel missing
- Unit B: Toilet paper low (2 rolls)

💰 Cost Savings:
- Bulk order soap: Save $34
- Switch coffee brand: Save $18/mo
- Optimal reorder timing: Save 15%

📈 Trends:
- Towel usage up 30% (summer)
- Coffee consumption: 3.2 pods/stay
- TP usage: 0.8 rolls/night
```

## Future Enhancements
1. **IoT Integration**: Smart locks report battery levels
2. **Guest Preferences**: Track amenity usage by guest
3. **Sustainability Tracking**: Eco-friendly alternatives
4. **Damage Prediction**: ML-based wear tracking
5. **Virtual Inventory**: 3D property mapping