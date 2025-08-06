# Airbnb Analytics Platform - Enhanced Product Requirements Document v2.0

## 1. Product Overview

### 1.1 Vision Statement
Build the most intelligent, accessible, and actionable analytics platform for Airbnb hosts by combining AI-powered insights with usage-based pricing, enabling hosts of all sizes to optimize their rental business through data-driven decisions.

### 1.2 Problem Statement
Airbnb hosts currently face:
- **Data Fragmentation**: Insights scattered across PDFs, CSVs, and dashboards
- **Analysis Paralysis**: Too much data, not enough actionable insights  
- **Expensive Solutions**: Flat-rate pricing excludes small hosts
- **Generic Insights**: Market data without personal context
- **Manual Tracking**: No automated monitoring or alerts
- **Hidden Decline**: Revenue drops detected too late

### 1.3 Solution
A progressive analytics platform that:
- **Charges per property** analyzed, not flat fees
- **Uses AI conversation** to collect optimal data
- **Delivers immediate value** with free first property
- **Provides actionable insights**, not just data
- **Monitors continuously** with smart alerts
- **Scales with success** through tiered pricing

### 1.4 Success Criteria
- **Month 6 Targets**:
  - 1,000 active users
  - $15K MRR
  - 15% free→paid conversion
  - 40% one-time→monthly conversion
  - <5% monthly churn
  - 50+ NPS score

---

## 2. User Personas & Use Cases

### 2.1 Primary Personas

#### Sarah - The Side Hustler
- **Properties**: 1-2 rentals
- **Pain**: Can't justify $40+/month tools
- **Need**: Affordable insights for optimization
- **Value**: Per-property pricing, free first analysis

#### Marcus - The Growing Host  
- **Properties**: 3-5 rentals
- **Pain**: Managing multiple properties manually
- **Need**: Portfolio comparison and priorities
- **Value**: Bulk discounts, cross-property insights

#### Jennifer - The Professional Manager
- **Properties**: 10+ rentals
- **Pain**: Inefficient reporting and tracking
- **Need**: Automated monitoring and white-label reports
- **Value**: Unlimited plans, API access, team features

### 2.2 Core Use Cases

```typescript
interface UserJourneys {
  firstTimeUser: {
    trigger: "Wondering why bookings are down",
    action: "Upload single PDF for free",
    value: "Discover 3 fixable issues",
    outcome: "Subscribe for monitoring"
  },
  
  returningUser: {
    trigger: "Monthly revenue review",
    action: "Upload new month's data",
    value: "See trends and comparisons",
    outcome: "Identify optimization opportunities"
  },
  
  powerUser: {
    trigger: "Portfolio optimization",
    action: "Analyze all properties",
    value: "Prioritize improvements",
    outcome: "Increase portfolio ROI 20%"
  }
}
```

---

## 3. Feature Requirements

### 3.1 Core Features (MVP - Weeks 1-4)

#### F1: Smart File Upload
```typescript
Requirements:
- Drag-and-drop interface
- Multi-file support (PDF, CSV, .ics)
- Client-side parsing when possible
- Progress indicators
- Error recovery

Acceptance Criteria:
- Parse 10MB PDF in <5 seconds
- Handle corrupted files gracefully
- Support batch uploads (10+ files)
- Show real-time progress
```

#### F2: Property Detection & Classification
```typescript
Requirements:
- Auto-detect unique properties
- Classify health status (active/inactive/expired)
- Calculate health scores (0-100)
- Show revenue metrics
- Smart selection defaults

Acceptance Criteria:
- 99% accuracy in property detection
- Classify status based on booking recency
- Pre-select optimal properties
- Display actionable health metrics
```

#### F3: Per-Property Pricing
```typescript
Requirements:
- Tiered volume pricing
- First property free for new users
- Clear pricing display
- Running total calculator
- Multiple payment options

Pricing Structure:
- Property 1: FREE (new users)
- Properties 2-5: $3 each
- Properties 6-10: $2 each
- Properties 11+: $1.50 each
- Unlimited: $49/month
```

#### F4: Basic Analytics Dashboard
```typescript
Requirements:
- Revenue metrics (gross, net, fees)
- Occupancy rates and trends
- Key performance indicators
- Simple visualizations
- Export capabilities

Metrics:
- Financial: Revenue, profit margins, fee analysis
- Operational: Occupancy, ADR, RevPAN
- Quality: Review scores, response rates
- Comparative: MoM changes, YoY growth
```

### 3.2 Enhancement Features (Weeks 5-8)

#### F5: AI-Guided Data Collection
```typescript
Requirements:
- Conversational interface
- Progressive enhancement
- Quality scoring (0-100%)
- Immediate feedback
- Skip options

Data Requests:
Priority 1 - Critical:
  - Listing URLs (quality analysis)
  
Priority 2 - Important:
  - Calendar files (forecasting)
  - Review data (satisfaction)
  
Priority 3 - Valuable:
  - Competitor URLs (positioning)
  - Expense data (profitability)

AI Responses:
- Acknowledge each addition
- Provide immediate insights
- Show quality improvement
- Suggest next steps
```

#### F6: Gemini AI Integration
```typescript
Requirements:
- Context-aware prompts
- Progressive insights
- Natural language summaries
- Actionable recommendations
- Confidence scoring

Prompt Templates:
- Basic: "Analyze performance and find opportunities"
- Enhanced: "Compare to market and suggest optimizations"
- Complete: "Provide strategic recommendations with ROI"

Output Format:
{
  insights: string[],        // Key findings
  opportunities: {           // Actionable items
    action: string,
    impact: number,
    effort: 'low' | 'medium' | 'high'
  }[],
  alerts: string[],          // Urgent issues
  confidence: number         // 0-100
}
```

#### F7: Advanced Reporting
```typescript
Requirements:
- PDF reports with branding
- Excel exports with formulas
- Interactive dashboards
- Shareable infographics
- Email delivery

Report Sections:
1. Executive Summary
2. Performance Metrics
3. AI Insights
4. Optimization Opportunities
5. Action Plan
6. Competitive Analysis
7. Forecast (if available)
```

#### F8: Portfolio Comparison View
```typescript
Requirements:
- Cross-property analytics
- Performance rankings
- Resource allocation insights
- Best practice identification
- Bulk optimization suggestions

Comparison Metrics:
- Revenue per property
- Occupancy rates
- Health scores
- Growth trends
- ROI potential
```

### 3.3 Scale Features (Weeks 9-12)

#### F9: Monthly Monitoring Subscription
```typescript
Requirements:
- Automated data collection
- Monthly comparison reports
- Smart alerts system
- Progress tracking
- Goal setting

Monitoring Features:
- Automatic report generation
- MoM/YoY comparisons
- Anomaly detection
- Competitor tracking
- SMS/Email alerts

Subscription Management:
- Flexible plan selection
- Usage tracking
- Billing integration
- Pause/resume options
- Plan upgrades/downgrades
```

#### F10: Market Intelligence
```typescript
Requirements:
- Aggregated market data
- Competitive benchmarking
- Seasonal trend analysis
- Pricing recommendations
- Demand forecasting

Data Privacy:
- Minimum 10 properties for aggregation
- Anonymized data only
- Opt-in participation
- Clear data usage policies
```

---

## 4. Technical Requirements

### 4.1 Architecture Requirements

#### Monorepo Structure
```yaml
Framework: Turborepo
Apps:
  - analytics: Next.js 14+ (App Router)
  - calendar: Existing (DO NOT MODIFY)
  - landing: Existing
  
Packages:
  - auth: Shared authentication
  - database: Supabase client
  - ui: Shared components
  - styles: Tailwind config
  
Requirements:
  - Complete isolation from calendar app
  - Port 3001 for analytics
  - Shared auth/styles only
  - No breaking changes
```

#### Technology Stack
```yaml
Frontend:
  - Next.js 14+ with App Router
  - TypeScript
  - Tailwind CSS
  - Shadcn/ui components
  - Recharts for visualizations
  
Backend:
  - Vercel Edge Functions
  - Supabase (PostgreSQL)
  - Redis for caching
  
AI/ML:
  - Google Gemini API
  - PDF.js for parsing
  - Natural for NLP
  
Payments:
  - Stripe for subscriptions
  - Usage-based billing API
```

### 4.2 Performance Requirements

```yaml
Page Load:
  - Initial: <2s (LCP)
  - Interactive: <3s (TTI)
  - API responses: <500ms p95
  
Processing:
  - PDF parsing: <5s for 10MB
  - AI analysis: <30s per property
  - Report generation: <10s
  
Reliability:
  - 99.9% uptime
  - Graceful degradation
  - Offline capability for uploads
  
Scale:
  - 10,000 concurrent users
  - 1M properties analyzed/month
  - 100GB storage for temp files
```

### 4.3 Security & Privacy Requirements

```yaml
Data Handling:
  - Immediate file deletion after parsing
  - No PII storage
  - Encrypted data transfer
  - GDPR/CCPA compliant
  
Authentication:
  - Supabase Auth (existing)
  - Row-level security
  - API key management
  - Session management
  
Privacy:
  - Hash property identifiers
  - Anonymize guest data
  - Aggregate reporting only
  - Clear consent flows
```

### 4.4 Integration Requirements

```yaml
External APIs:
  - Google Gemini: AI analysis
  - Stripe: Payments
  - SendGrid: Email delivery
  - Twilio: SMS alerts
  
File Formats:
  - PDF: Airbnb statements
  - CSV: Transaction history
  - ICS: Calendar exports
  - JSON: API responses
  
Webhooks:
  - Payment events
  - Subscription changes
  - Data processing completion
  - Alert triggers
```

---

## 5. Database Schema

### 5.1 Core Tables

```sql
-- Property Management
CREATE TABLE analytics_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    property_hash VARCHAR(64) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'seasonal', 'inactive', 'expired')),
    health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
    last_booking_date DATE,
    months_inactive INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2),
    avg_monthly_revenue DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, property_hash)
);

-- Analysis Sessions
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    properties_analyzed INTEGER,
    properties_selected INTEGER,
    data_completeness INTEGER,
    total_cost DECIMAL(10,2),
    payment_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE analytics_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    property_id UUID REFERENCES analytics_properties(id),
    session_id UUID REFERENCES analytics_sessions(id),
    usage_type VARCHAR(20) CHECK (usage_type IN ('one_time', 'monthly')),
    credits_used INTEGER DEFAULT 1,
    price_paid DECIMAL(10,2),
    analysis_depth VARCHAR(20),
    data_completeness INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Enhancements
CREATE TABLE analytics_enhancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES analytics_properties(id),
    session_id UUID REFERENCES analytics_sessions(id),
    enhancement_type VARCHAR(50),
    data_provided JSONB,
    quality_before INTEGER,
    quality_after INTEGER,
    ai_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE analytics_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    stripe_subscription_id VARCHAR(255),
    plan_type VARCHAR(50),
    property_count INTEGER,
    property_ids UUID[],
    monthly_price DECIMAL(10,2),
    status VARCHAR(20),
    current_period_start DATE,
    current_period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Reports
CREATE TABLE analytics_monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES analytics_subscriptions(id),
    property_id UUID REFERENCES analytics_properties(id),
    report_month DATE,
    metrics JSONB,
    insights JSONB,
    recommendations JSONB,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.2 Indexes & Performance

```sql
-- Performance indexes
CREATE INDEX idx_properties_user_status ON analytics_properties(user_id, status);
CREATE INDEX idx_properties_health ON analytics_properties(health_score DESC);
CREATE INDEX idx_usage_user_date ON analytics_usage(user_id, created_at DESC);
CREATE INDEX idx_sessions_user ON analytics_sessions(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_active ON analytics_subscriptions(status) WHERE status = 'active';

-- Materialized views for analytics
CREATE MATERIALIZED VIEW user_analytics_summary AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT p.id) as total_properties,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_properties,
    AVG(p.health_score) as avg_health_score,
    SUM(p.total_revenue) as portfolio_revenue,
    MAX(s.created_at) as last_analysis,
    COUNT(DISTINCT s.id) as total_analyses
FROM auth.users u
LEFT JOIN analytics_properties p ON u.id = p.user_id
LEFT JOIN analytics_sessions s ON u.id = s.user_id
GROUP BY u.id;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_user_summary()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_summary;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. User Interface Requirements

### 6.1 Key Screens

#### Upload Screen
```typescript
Components:
- DropZone: Drag-and-drop area
- FileList: Uploaded files with status
- ProgressBar: Upload/parsing progress
- HelpPanel: Where to find files

States:
- Empty: Show instructions
- Uploading: Progress indicators
- Processing: Parsing animation
- Complete: Show results

Interactions:
- Drag over: Visual feedback
- Drop: Start processing
- Error: Clear error messages
- Success: Proceed to selection
```

#### Property Selection Screen
```typescript
Layout:
- Header: Summary stats
- Filters: Active/Inactive/All
- Grid: Property cards
- Sidebar: Pricing calculator
- Footer: Action buttons

Property Card:
- Name and status badge
- Health score (0-100)
- Last booking date
- Revenue metrics
- Selection checkbox
- Price when selected

Smart Features:
- Auto-select active
- Bulk selection tools
- Sort by health/revenue
- Visual status indicators
```

#### AI Enhancement Screen
```typescript
Interface:
- Chat-like conversation
- Progress indicator
- Quality score meter
- Data request cards
- Skip options

Flow:
1. AI introduces itself
2. Explains benefits
3. Requests critical data
4. Shows impact of each addition
5. Celebrates completeness

Gamification:
- Quality score increases
- Unlock badges
- Progress rewards
- Completion celebration
```

#### Dashboard Screen
```typescript
Sections:
- KPI Cards: Revenue, occupancy, health
- Charts: Trends, comparisons
- Insights: AI-generated text
- Actions: Prioritized tasks
- Reports: Download options

Responsive Design:
- Mobile: Stacked cards
- Tablet: 2-column grid
- Desktop: Full dashboard
- Print: Optimized layout
```

#### Portfolio Comparison Screen
```typescript
Views:
- Grid: All properties
- Chart: Comparative metrics
- Table: Detailed data
- Map: Geographic distribution

Interactions:
- Sort by any metric
- Filter by status
- Compare subsets
- Export selections

Insights:
- Best performers
- Attention needed
- Optimization opportunities
- Cross-pollination ideas
```

#### Monthly Upsell Screen
```typescript
Sections:
1. Success message
2. Portfolio overview
3. What you're missing
4. Sample monthly report
5. Personalized pricing
6. Social proof
7. Clear CTA

Psychology:
- Show value first
- Create FOMO
- Personalize offer
- Multiple price anchors
- Urgency elements
```

### 6.2 Design System

```typescript
// Design tokens
const design = {
  colors: {
    primary: '#FF5A5F',     // Airbnb red
    success: '#00A699',     // Teal
    warning: '#FC642D',     // Orange
    danger: '#FF5A5F',      // Red
    info: '#484848',        // Dark gray
    
    // Health scores
    healthy: '#00A699',
    moderate: '#FFC107',
    poor: '#FF5A5F'
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  
  typography: {
    headingXL: '32px/40px',
    headingL: '24px/32px',
    headingM: '20px/28px',
    bodyL: '16px/24px',
    bodyM: '14px/20px',
    bodyS: '12px/16px'
  }
};
```

---

## 7. API Specifications

### 7.1 Core Endpoints

```typescript
// File Processing
POST /api/analytics/upload
  Body: FormData with files
  Response: { sessionId, properties: Property[] }

// Property Selection  
POST /api/analytics/select
  Body: { sessionId, propertyIds: string[] }
  Response: { pricing: PricingDetails, enhancements: Enhancement[] }

// AI Enhancement
POST /api/analytics/enhance
  Body: { propertyId, dataType, data: any }
  Response: { quality: number, insights: string[] }

// Analysis
POST /api/analytics/analyze
  Body: { sessionId, propertyIds: string[] }
  Response: { analyses: Analysis[], reports: Report[] }

// Payment
POST /api/analytics/payment
  Body: { sessionId, paymentMethod, amount }
  Response: { success: boolean, receiptUrl: string }

// Subscription
POST /api/analytics/subscribe
  Body: { plan, propertyIds: string[] }
  Response: { subscriptionId, status }

// Reports
GET /api/analytics/reports/:reportId
  Response: Report (PDF/Excel/JSON)

// Monthly Data
GET /api/analytics/monthly/:propertyId
  Response: { current: Metrics, previous: Metrics, insights: string[] }
```

### 7.2 Webhook Events

```typescript
// Stripe webhooks
POST /api/webhooks/stripe
  Events:
    - payment_intent.succeeded
    - subscription.created
    - subscription.updated
    - subscription.deleted
    - invoice.payment_failed

// Processing webhooks  
POST /api/webhooks/processing
  Events:
    - analysis.completed
    - report.generated
    - enhancement.processed
    - monthly_report.ready
```

---

## 8. Analytics & Metrics

### 8.1 Product Metrics

```sql
-- Conversion Funnel
WITH funnel AS (
  SELECT 
    user_id,
    MAX(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) as viewed,
    MAX(CASE WHEN event = 'file_uploaded' THEN 1 ELSE 0 END) as uploaded,
    MAX(CASE WHEN event = 'properties_selected' THEN 1 ELSE 0 END) as selected,
    MAX(CASE WHEN event = 'enhancement_added' THEN 1 ELSE 0 END) as enhanced,
    MAX(CASE WHEN event = 'payment_completed' THEN 1 ELSE 0 END) as paid,
    MAX(CASE WHEN event = 'subscription_started' THEN 1 ELSE 0 END) as subscribed
  FROM analytics_events
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_users,
  SUM(viewed) as viewed,
  SUM(uploaded) as uploaded,
  SUM(selected) as selected,
  SUM(enhanced) as enhanced,
  SUM(paid) as paid,
  SUM(subscribed) as subscribed,
  
  -- Conversion rates
  ROUND(100.0 * SUM(uploaded) / NULLIF(SUM(viewed), 0), 2) as upload_rate,
  ROUND(100.0 * SUM(selected) / NULLIF(SUM(uploaded), 0), 2) as selection_rate,
  ROUND(100.0 * SUM(enhanced) / NULLIF(SUM(selected), 0), 2) as enhancement_rate,
  ROUND(100.0 * SUM(paid) / NULLIF(SUM(selected), 0), 2) as payment_rate,
  ROUND(100.0 * SUM(subscribed) / NULLIF(SUM(paid), 0), 2) as subscription_rate
FROM funnel;
```

### 8.2 Revenue Metrics

```sql
-- Revenue Analysis
WITH revenue AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(CASE WHEN usage_type = 'one_time' THEN price_paid ELSE 0 END) as one_time_revenue,
    SUM(CASE WHEN usage_type = 'monthly' THEN price_paid ELSE 0 END) as recurring_revenue,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT property_id) as properties_analyzed,
    AVG(price_paid) as avg_transaction_value
  FROM analytics_usage
  GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
  month,
  one_time_revenue,
  recurring_revenue,
  one_time_revenue + recurring_revenue as total_revenue,
  unique_users,
  properties_analyzed,
  avg_transaction_value,
  (one_time_revenue + recurring_revenue) / NULLIF(unique_users, 0) as arpu,
  
  -- Growth metrics
  LAG(one_time_revenue + recurring_revenue) OVER (ORDER BY month) as prev_month_revenue,
  ROUND(100.0 * ((one_time_revenue + recurring_revenue) - 
    LAG(one_time_revenue + recurring_revenue) OVER (ORDER BY month)) / 
    NULLIF(LAG(one_time_revenue + recurring_revenue) OVER (ORDER BY month), 0), 2) as mom_growth
FROM revenue
ORDER BY month DESC;
```

### 8.3 Usage Patterns

```sql
-- Property Analysis Patterns
SELECT 
  properties_per_user,
  COUNT(*) as user_count,
  AVG(conversion_rate) as avg_conversion,
  AVG(monthly_value) as avg_monthly_value
FROM (
  SELECT 
    user_id,
    COUNT(DISTINCT property_id) as properties_per_user,
    SUM(CASE WHEN usage_type = 'monthly' THEN 1.0 ELSE 0 END) / 
      NULLIF(COUNT(*), 0) as conversion_rate,
    SUM(CASE WHEN usage_type = 'monthly' THEN price_paid ELSE 0 END) as monthly_value
  FROM analytics_usage
  GROUP BY user_id
) user_stats
GROUP BY properties_per_user
ORDER BY properties_per_user;
```

---

## 9. Launch Strategy

### 9.1 Beta Launch (Weeks 1-2)
```yaml
Audience: 50 hand-picked hosts
Offer: Free unlimited access
Goals:
  - Validate core flows
  - Refine AI responses
  - Fix critical bugs
  - Gather testimonials
  
Metrics:
  - Completion rate >80%
  - NPS >50
  - Critical bugs <5
```

### 9.2 Soft Launch (Weeks 3-4)
```yaml
Audience: Existing GoStudioM users
Offer: 50% discount for 3 months
Goals:
  - Test payment flows
  - Validate pricing
  - Scale infrastructure
  - Build initial MRR
  
Targets:
  - 200 users
  - 30% conversion
  - $1K MRR
```

### 9.3 Public Launch (Month 2)
```yaml
Channels:
  - Product Hunt launch
  - Airbnb Facebook groups
  - YouTube tutorials
  - SEO content
  
Offer: First property free forever
Goals:
  - 500 new users
  - 15% conversion
  - $5K MRR
  - Press coverage
```

### 9.4 Growth Phase (Months 3-6)
```yaml
Strategies:
  - Referral program (3 free analyses)
  - Partnership with cleaners
  - Influencer collaborations
  - Paid acquisition
  
Targets:
  - 1000+ users
  - $15K MRR
  - CAC <$30
  - LTV:CAC >3:1
```

---

## 10. Risk Management

### 10.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PDF format changes | High | High | Multiple parsers, OCR fallback, manual queue |
| AI API costs | Medium | High | Caching, tiered models, usage limits |
| Low conversion | Medium | High | Free tier, clear value, testimonials |
| Competition | High | Medium | Unique features, lower price, faster innovation |
| Churn | Medium | Medium | Engagement features, value reminders, win-back |
| Data accuracy | Low | High | Validation, confidence scores, user feedback |
| Scale issues | Low | Medium | Auto-scaling, CDN, edge functions |
| Security breach | Low | High | Encryption, audits, insurance, no PII storage |

### 10.2 Contingency Plans

```typescript
const contingencies = {
  pdfParsingFailure: {
    detection: "Error rate >5%",
    response: "Switch to OCR, notify users, manual processing",
    escalation: "Engineering priority fix"
  },
  
  aiCostOverrun: {
    detection: "Daily cost >$500",
    response: "Throttle requests, use cached responses, smaller models",
    escalation: "Renegotiate pricing, find alternatives"
  },
  
  lowConversion: {
    detection: "Conversion <10%",
    response: "A/B test pricing, improve onboarding, add value",
    escalation: "Pivot to different model"
  }
};
```

---

## 11. Success Metrics & KPIs

### 11.1 North Star Metrics

```yaml
Primary: Monthly Recurring Revenue (MRR)
  Target: $15K by month 6
  Growth: 50% MoM for first 6 months
  
Secondary: Properties Analyzed per Month
  Target: 5,000 by month 6
  Quality: >60% data completeness
  
Tertiary: User Retention
  Target: <5% monthly churn
  Engagement: >60% MAU
```

### 11.2 OKRs (Q1)

```yaml
Objective 1: Build a loved product
  KR1: NPS score >50
  KR2: 4.5+ star reviews
  KR3: <24hr support response
  
Objective 2: Achieve product-market fit
  KR1: 15% free to paid conversion
  KR2: 40% one-time to monthly conversion
  KR3: 100+ testimonials
  
Objective 3: Create sustainable growth
  KR1: CAC <$30
  KR2: LTV >$400
  KR3: 30% organic traffic
```

### 11.3 Tracking Dashboard

```sql
-- Executive Dashboard Query
SELECT 
  -- Revenue
  SUM(CASE WHEN date = CURRENT_DATE THEN revenue ELSE 0 END) as today_revenue,
  SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) THEN revenue ELSE 0 END) as mtd_revenue,
  SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' 
       AND date < DATE_TRUNC('month', CURRENT_DATE) THEN revenue ELSE 0 END) as last_month_revenue,
  
  -- Users
  COUNT(DISTINCT CASE WHEN date = CURRENT_DATE THEN user_id END) as dau,
  COUNT(DISTINCT CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN user_id END) as mau,
  COUNT(DISTINCT CASE WHEN subscription_status = 'active' THEN user_id END) as subscribers,
  
  -- Engagement
  AVG(properties_per_user) as avg_properties,
  AVG(data_completeness) as avg_completeness,
  AVG(CASE WHEN usage_type = 'monthly' THEN 1.0 ELSE 0 END) as subscription_rate,
  
  -- Health
  AVG(CASE WHEN last_active >= CURRENT_DATE - INTERVAL '7 days' THEN 1.0 ELSE 0 END) as wau_mau_ratio,
  AVG(CASE WHEN churned THEN 1.0 ELSE 0 END) as churn_rate,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY nps_score) as median_nps
  
FROM analytics_metrics
WHERE date >= CURRENT_DATE - INTERVAL '90 days';
```

---

## 12. Appendices

### Appendix A: Detailed User Flows
[Comprehensive flow diagrams for each user journey]

### Appendix B: Component Library
[Complete UI component specifications]

### Appendix C: API Documentation
[Full OpenAPI specification]

### Appendix D: Database Migrations
[Version-controlled migration scripts]

### Appendix E: Analytics Queries
[Production-ready SQL for all metrics]

### Appendix F: A/B Test Catalog
[Planned experiments and hypotheses]

---

## Document Control

**Version**: 2.0
**Last Updated**: Current
**Owner**: Product Team
**Reviewers**: Engineering, Design, Data, Marketing
**Status**: Ready for Development

## Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | Current | Added per-property pricing, AI enhancement flow, portfolio comparison, monthly upsell | Product Team |
| 1.0 | Previous | Initial PRD with basic features | Product Team |