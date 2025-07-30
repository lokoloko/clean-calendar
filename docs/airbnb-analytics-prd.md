# Airbnb Analytics Add-on - Product Requirements Document

## 1. Executive Summary

### Product Overview
An AI-powered analytics add-on for the existing cleaner app that processes Airbnb monthly earnings PDFs to provide hosts with actionable insights, revenue optimization recommendations, and operational efficiency metrics.

### Key Features
- PDF upload and parsing with immediate deletion (privacy-first)
- Gemini AI-powered analysis and insights
- Integration with existing cleaning data
- Aggregated market reports capability
- Progressive analytics that improve with more data

### Pricing Strategy
- **Standalone Add-on**: $10/month
- **Included in Tier 3**: $29/month (full platform access)

---

## 2. Technical Architecture

### Data Flow
```
1. User uploads PDF → 
2. Parse PDF data → 
3. Store structured data in DB → 
4. Delete PDF file → 
5. Gemini AI analysis → 
6. Display insights
```

### Database Schema

```sql
-- Core earnings data
CREATE TABLE earnings_data (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    report_month DATE,
    upload_date TIMESTAMP,
    
    -- Summary data
    gross_earnings DECIMAL(10,2),
    total_adjustments DECIMAL(10,2),
    service_fees DECIMAL(10,2),
    tax_withheld DECIMAL(10,2),
    net_earnings DECIMAL(10,2),
    
    -- Performance metrics
    nights_booked INTEGER,
    avg_night_stay DECIMAL(4,2),
    
    -- Metadata for aggregation
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    anonymized_location_id UUID, -- For market reports
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Unit-level data
CREATE TABLE unit_earnings (
    id UUID PRIMARY KEY,
    earnings_data_id UUID REFERENCES earnings_data(id),
    unit_identifier VARCHAR(50), -- Hashed for privacy
    
    -- Financial data
    gross_earnings DECIMAL(10,2),
    adjustments DECIMAL(10,2),
    service_fees DECIMAL(10,2),
    tax_withheld DECIMAL(10,2),
    net_earnings DECIMAL(10,2),
    
    -- Performance data
    nights_booked INTEGER,
    avg_night_stay DECIMAL(4,2),
    
    -- Calculated metrics (stored for performance)
    occupancy_rate DECIMAL(5,2),
    avg_nightly_rate DECIMAL(10,2),
    revenue_per_available_night DECIMAL(10,2)
);

-- Aggregated insights cache
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    insight_type VARCHAR(50), -- 'monthly', 'quarterly', 'annual'
    generated_date TIMESTAMP,
    insights_json JSONB,
    expires_at TIMESTAMP
);
```

---

## 3. Calculations & Metrics

### Basic Calculations

```javascript
// Occupancy Rate
occupancy_rate = (nights_booked / days_in_month) * 100

// Average Nightly Rate
avg_nightly_rate = gross_earnings / nights_booked

// Revenue per Available Night (RevPAN)
revpan = gross_earnings / days_in_month

// Net Profit Margin
net_margin = (net_earnings / gross_earnings) * 100

// Service Fee Percentage (validation)
service_fee_pct = (service_fees / gross_earnings) * 100
// Alert if != 3% (Airbnb's standard)

// Average Booking Value
avg_booking_value = gross_earnings / (nights_booked / avg_night_stay)
```

### Cleaning Integration Calculations

```javascript
// Revenue per Cleaning
revenue_per_cleaning = gross_earnings / number_of_cleanings

// Cleaning Cost Percentage
cleaning_cost_pct = (total_cleaning_costs / gross_earnings) * 100

// Profit per Booking
profit_per_booking = avg_booking_value - avg_cleaning_cost

// Optimal Minimum Stay
// Calculate profit margins for different stay lengths
profit_margins = {}
for (stay_length of [1, 2, 3, 4, 5, 7]) {
    bookings = nights_booked / stay_length
    cleanings = bookings
    revenue = gross_earnings
    cleaning_costs = cleanings * avg_cleaning_cost
    profit_margins[stay_length] = (revenue - cleaning_costs) / revenue
}
```

### Trend Calculations (3+ months)

```javascript
// Month-over-Month Growth
mom_growth = ((current_month - previous_month) / previous_month) * 100

// Moving Average (3-month)
moving_avg = (month1 + month2 + month3) / 3

// Seasonality Index
seasonality_index = month_revenue / annual_average_monthly_revenue

// Trend Direction
linear_regression(months, revenues) => slope, intercept
trend = slope > 0 ? 'increasing' : 'decreasing'
```

### Predictive Calculations (6+ months)

```javascript
// Simple Forecasting
// Using weighted moving average with seasonality
forecast = (w1 * month_n-1 + w2 * month_n-2 + w3 * month_n-3) * seasonality_factor

// Booking Probability
// Based on historical occupancy patterns
booking_probability = historical_bookings_for_day / total_similar_days

// Price Elasticity Estimation
price_changes = calculate_price_changes_between_months()
occupancy_changes = calculate_occupancy_changes()
elasticity = occupancy_change_pct / price_change_pct
```

---

## 4. Implementation Phases

### Phase 1: MVP (Month 1-2)

**Features:**
- PDF upload and parsing
- Basic dashboard with current month metrics
- Simple month-over-month comparison
- Data storage and PDF deletion

**Gemini AI Prompts:**
```
"Analyze this Airbnb earnings data and provide 3 key insights:
{monthly_data_json}
Focus on: revenue performance, occupancy rates, and obvious opportunities"
```

**Deliverables:**
- Upload interface
- Basic metrics dashboard
- 3-5 AI-generated insights
- Database schema implementation

### Phase 2: Trend Analysis (Month 3-4)

**Features:**
- Historical trending (3-6 months)
- Comparative unit analysis
- Cleaning cost integration
- Revenue forecasting (basic)

**Gemini AI Prompts:**
```
"Analyze these Airbnb earnings trends and provide:
1. Seasonal patterns
2. Unit performance rankings
3. Revenue optimization suggestions
4. Cleaning efficiency insights
Data: {historical_data_json}
Cleaning data: {cleaning_data_json}"
```

**New Calculations:**
- Trend lines and growth rates
- Unit performance scoring
- Cleaning ROI metrics

### Phase 3: Advanced Analytics (Month 5-6)

**Features:**
- Predictive analytics (12+ months data)
- Market report generation
- Automated recommendations
- API for enterprise users

**Gemini AI Prompts:**
```
"Perform advanced analysis on this portfolio:
1. Predict next 3 months revenue
2. Identify optimization opportunities with ROI
3. Compare to market aggregates
4. Strategic recommendations
Historical data: {all_data_json}
Market benchmarks: {aggregate_data_json}"
```

**Market Reports:**
- Anonymized aggregate data by city/region
- Industry benchmarks
- Seasonal trends by market

---

## 5. API Endpoints

```javascript
// Phase 1
POST /api/analytics/upload
  - Accepts: PDF file
  - Returns: Processing status
  
GET /api/analytics/summary
  - Returns: Current month summary

// Phase 2  
GET /api/analytics/trends
  - Query params: start_date, end_date
  - Returns: Trend data and insights

GET /api/analytics/units/{unit_id}
  - Returns: Specific unit performance

// Phase 3
GET /api/analytics/forecast
  - Returns: Revenue predictions

GET /api/analytics/market-report
  - Query params: location, date_range
  - Returns: Aggregated market data
```

---

## 6. Data Privacy & Security

### Privacy Measures
1. **PDF Deletion**: Immediate deletion after parsing
2. **Data Anonymization**: Unit names hashed, location generalized
3. **Aggregate Reports**: Minimum 10 properties for market data
4. **User Consent**: Opt-in for aggregate data sharing

### Security Implementation
```javascript
// PDF Processing
async function processPDF(file) {
    const data = await parsePDF(file);
    await saveToDatabase(data);
    await deleteFile(file); // Immediate deletion
    return data;
}

// Data Anonymization
function anonymizeUnit(unitName) {
    return crypto.createHash('sha256')
        .update(unitName + userId)
        .digest('hex')
        .substring(0, 8);
}
```

---

## 7. Gemini AI Integration

### Prompt Templates

**Monthly Analysis:**
```javascript
const monthlyPrompt = `
Analyze this Airbnb host data and provide actionable insights:

Current Month Data: ${JSON.stringify(currentMonth)}
Previous Month Data: ${JSON.stringify(previousMonth)}

Provide:
1. Top 3 performance insights
2. 2 specific optimization opportunities with estimated impact
3. Any concerning trends that need attention

Format as JSON: {
  insights: [],
  opportunities: [{action, impact, unit}],
  alerts: []
}
`;
```

**Portfolio Optimization:**
```javascript
const portfolioPrompt = `
Analyze this Airbnb portfolio for optimization opportunities:

Historical Data: ${JSON.stringify(historicalData)}
Cleaning Costs: ${JSON.stringify(cleaningData)}

Recommend:
1. Optimal pricing adjustments by unit
2. Minimum stay recommendations
3. Units to focus on vs consider dropping
4. Seasonal strategies

Include specific numbers and expected ROI.
`;
```

---

## 8. Success Metrics

### User Metrics
- **Adoption Rate**: % of tier 3 users activating analytics
- **Retention**: Monthly active users of analytics
- **Data Input**: Average PDFs uploaded per user
- **Feature Usage**: Which insights drive most engagement

### Business Metrics
- **Revenue Impact**: Additional MRR from add-on
- **Tier 3 Conversion**: Users upgrading for analytics
- **Market Report Value**: Enterprise interest in aggregate data

### Technical Metrics
- **Processing Time**: PDF parse + AI analysis < 30 seconds
- **Accuracy**: Parsed data validation rate > 99%
- **AI Quality**: User feedback on insight relevance

---

## 9. Launch Plan

### Beta Phase (2 weeks)
- 50 select users
- Free access for feedback
- Daily monitoring and iterations

### Soft Launch (Month 1)
- Tier 3 users only
- 50% discount for early adopters
- Gather feedback for Phase 2

### Full Launch (Month 2)
- Available as add-on
- Marketing campaign to existing users
- Webinar training series

### Market Reports (Month 6)
- After sufficient data aggregation
- Partnership opportunities
- Enterprise pricing model

---

## 10. Future Enhancements

### Potential Features
1. **Multi-platform Integration**: VRBO, Booking.com data
2. **Expense Tracking**: Full P&L analysis
3. **Tax Optimization**: Automated categorization
4. **AI Chatbot**: "Ask questions about your data"
5. **Competitor Analysis**: Anonymous performance benchmarking
6. **Revenue Management**: Dynamic pricing recommendations
7. **Mobile App**: iOS/Android analytics on-the-go