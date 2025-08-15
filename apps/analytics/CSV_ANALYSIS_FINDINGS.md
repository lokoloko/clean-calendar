# CSV Analysis Findings & Fixes

## Executive Summary
The Airbnb CSV analytics app was showing drastically incorrect metrics due to fundamental data processing issues. After deep analysis, we discovered and fixed multiple critical bugs that were causing revenue miscalculation, 1.7x overcounting of nights, and impossible occupancy rates (ranging from 0% to 2200%).

## Key Discoveries

### 1. Duplicate Confirmation Codes (Root Cause #1)
**Finding**: Long-term bookings create multiple CSV rows for monthly payments
- Each row represents a payment installment, not a separate booking
- All rows share the same confirmation code
- Each row duplicates the TOTAL nights for the entire stay

**Example**:
```
Confirmation: HMD2TB83Y2
- 13 payment rows × 230 nights per row = 2,990 nights (WRONG)
- Actual booking: 230 nights (CORRECT)
```

**Impact**: 1.7x overcounting of nights booked

### 2. String Sorting vs Date Sorting (Root Cause #2)
**Finding**: Dates were being sorted as strings instead of Date objects
- String sort: "01/01/2022" comes before "12/31/2021" alphabetically
- This caused end dates to appear before start dates
- Result: Negative day spans and impossible occupancy calculations

**Example**:
```javascript
// WRONG (String sorting)
['01/01/2022', '12/31/2021'].sort() 
// Result: ['01/01/2022', '12/31/2021'] - incorrect order!

// CORRECT (Date sorting)
dates.map(d => new Date(d)).sort((a,b) => a - b)
// Result: [Dec 31 2021, Jan 1 2022] - correct chronological order
```

**Impact**: Occupancy rates showing as -220,300% or similar impossible values

### 3. Revenue Display Issues
**Finding**: All properties were showing the same revenue value
- Properties page was displaying portfolio total for each property
- Individual property revenues were not being extracted correctly

**Impact**: Unable to compare property performance

### 4. Date Range Misunderstanding
**Finding**: CSV contains multiple date types that were being confused:
- **Booking dates**: When reservations were made (not relevant for occupancy)
- **Stay dates**: When guests actually stayed (THIS is for occupancy)
- **Transaction dates**: When payments were processed

**Impact**: Occupancy calculated against wrong date ranges

## Fixes Implemented

### Fix #1: Confirmation Code Deduplication
**File**: `lib/parsers/csv-parser.ts`

```typescript
// Group reservations by confirmation code
private groupReservationsByConfirmationCode(transactions: Transaction[]) {
  const grouped = new Map()
  
  for (const transaction of reservations) {
    const code = transaction.confirmationCode
    
    if (!grouped.has(code)) {
      // First occurrence - initialize with nights value
      grouped.set(code, {
        nights: transaction.nights, // Take nights ONCE
        totalRevenue: 0
      })
    }
    
    // Add revenue from all payment rows
    grouped.get(code).totalRevenue += transaction.grossEarnings
  }
  
  return grouped
}
```

**Result**: Accurate night counts (11,513 instead of 19,608)

### Fix #2: Proper Date Sorting
**File**: `lib/parsers/csv-parser.ts`

```typescript
// Convert to Date objects before comparison
const bookingStart = booking.startDate ? new Date(booking.startDate) : null
const currentStart = metrics.dateRange.start ? new Date(metrics.dateRange.start) : null

if (bookingStart && (!currentStart || bookingStart < currentStart)) {
  metrics.dateRange.start = booking.startDate
}
```

**Result**: Correct date ranges and realistic occupancy rates (60-90%)

### Fix #3: Individual Property Revenue
**File**: `app/properties/page.tsx`

```typescript
// Each property shows its own revenue
metrics: {
  revenue: { value: prop.revenue || prop.totalRevenue || prop.netEarnings || 0 }
}

// Portfolio total properly sums all properties
totalRevenue: properties.reduce((sum, p) => {
  const value = p.metrics?.revenue?.value
  if (typeof value === 'number') return sum + value
  if (value?.value) return sum + value.value
  return sum
}, 0)
```

**Result**: Each property displays its individual revenue correctly

### Fix #4: Health Score Calculation
**File**: `app/properties/page.tsx`

Implemented comprehensive scoring based on:
- Revenue performance (30% weight)
- Occupancy rate (40% weight)
- Data quality (30% weight)

**Result**: Meaningful health scores (0-100) based on actual performance

## Validation Results

### Before Fixes
- **Occupancy**: 0% or 695% or -220,300%
- **Nights**: 19,608 (overcounted)
- **Revenue**: Same value for all properties
- **Date spans**: Negative values

### After Fixes
- **Occupancy**: 63-93% (realistic range)
- **Nights**: 11,513 (accurate)
- **Revenue**: Individual values per property
- **Date spans**: Proper multi-year ranges

### Top Properties (Corrected Data)
1. **Tranquil Apartment**: $239,812 revenue, 78.3% occupancy over 7.7 years
2. **Monrovia Charm**: $234,935 revenue, 83.4% occupancy over 7.2 years
3. **Private Studio**: $127,771 revenue, 68.1% occupancy over 6.5 years

## Technical Details

### CSV Structure Understanding
The Airbnb CSV contains:
- **1,486 total rows** representing transactions
- **1,348 unique bookings** (by confirmation code)
- **93% single-payment bookings**
- **7% multi-payment bookings** (long-term stays with monthly installments)

### Data Processing Pipeline
1. Parse CSV with Papa Parse
2. Group transactions by confirmation code
3. Take nights value once per booking
4. Sum all payments per booking
5. Calculate metrics using proper date ranges
6. Display individual property data

## Lessons Learned

1. **Always validate assumptions about data structure** - The CSV wasn't one row per booking
2. **Use proper data types** - String sorting of dates caused major issues
3. **Test with real data** - Mock data masked these critical bugs
4. **Understand domain context** - Different date types serve different purposes

## Files Modified

- `lib/parsers/csv-parser.ts` - Core CSV parsing logic
- `app/properties/page.tsx` - Properties list display
- `app/property/[id]/page.tsx` - Individual property display
- `app/property/[id]/components/MetricsDashboard.tsx` - Metrics cards

## Status
✅ All critical data accuracy issues have been resolved. The app now displays correct, meaningful analytics for Airbnb property data.