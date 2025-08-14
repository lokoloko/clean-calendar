# Missing Data Points from Airbnb PDFs

Based on the analysis, here are data points we're NOT currently extracting but should:

## 🚨 HIGH PRIORITY - Financial Data
1. **Adjustments** - Line item in earnings (cancellations, changes)
2. **Tax Withheld** - Income taxes withheld by Airbnb
3. **Pass Through Tax** - Set by host, collected and sent to host
4. **Host Remitted Tax** - Set by host
5. **Airbnb Remitted Tax** - Automatically collected and paid by Airbnb
6. **Resolutions** - Reimbursements, adjustments, extra fees
7. **Monthly Breakdown** - Month-by-month earnings throughout the year

## 📊 Performance Metrics
1. **Occupancy Rate** - Could be calculated from nights/available days
2. **Average Daily Rate (ADR)** - Revenue divided by nights
3. **Booking Lead Time** - How far in advance bookings are made
4. **Guest Ratings** - If included in the report
5. **Cancellation Rate** - From adjustments data

## 🏦 Payment Information
1. **Payment Methods** - Bank accounts receiving payments
2. **Payment Schedule** - When payments were received
3. **Currency** - USD or other currencies
4. **Tax ID Number** - Business tax identification

## 📅 Time-based Data
1. **Report Generation Date** - When report was created
2. **Seasonal Trends** - Peak/low seasons from monthly data
3. **Year-over-Year Comparison** - If multiple years included

## 🏠 Property-Specific Details
1. **Property Address** - If included
2. **Property Type** - House, apartment, etc.
3. **Check-in/Check-out Times** - If specified
4. **Individual Property Taxes** - Per-property tax breakdown

## 💡 Additional Insights
1. **Service Fee Percentage** - Currently hardcoded at 3%, but could vary
2. **Experience Fees** - 20% for experiences
3. **Services Fees** - 15% for services
4. **VAT/GST Information** - For international hosts

## Current Extraction Status

### ✅ Currently Extracting:
- Total Gross Earnings
- Total Service Fees  
- Total Net Earnings
- Total Nights Booked
- Average Night Stay
- Property Names
- Per-Property Earnings
- Per-Property Nights
- Date Range/Period

### ❌ NOT Extracting (Should Add):
- Adjustments (important for accurate revenue)
- All tax categories (5 different types!)
- Monthly breakdown data
- Resolutions/reimbursements
- Payment method details
- Occupancy rates
- Property-specific tax amounts

## Implementation Priority

1. **Phase 1 - Critical Financial** (Add immediately)
   - Adjustments column
   - Tax withheld amounts
   - Monthly breakdown parsing
   - Resolutions

2. **Phase 2 - Analytics** (Add for better insights)
   - Occupancy rate calculation
   - ADR calculation
   - Seasonal trend analysis
   - Tax breakdown by category

3. **Phase 3 - Nice to Have**
   - Payment method tracking
   - Multi-currency support
   - YoY comparisons