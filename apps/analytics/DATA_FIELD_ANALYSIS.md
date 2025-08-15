# Data Field Analysis - Complete Audit

## 1. Properties Page (`/properties`)

### Table Columns
| Field | Source | Current Logic | Status |
|-------|--------|--------------|--------|
| **Property Name** | `property.standardName \|\| property.name` | ✅ Correct |
| **Revenue** | `property.metrics?.revenue?.value` | ✅ Fixed - Shows individual property revenue |
| **Health** | `property.metrics?.health` | ⚠️ Generic calculation (80 if revenue > 0, else 40) |
| **Completeness** | `property.dataCompleteness` | ✅ Based on data sources |
| **Updated** | `property.updatedAt` | ✅ Correct |

### Summary Cards
| Card | Calculation | Status |
|------|------------|--------|
| **Total Properties** | `stats.total` (count) | ✅ Correct |
| **Complete** | Count where `dataCompleteness === 100` | ✅ Correct |
| **Actions Needed** | Count where `dataCompleteness < 100` | ✅ Correct |
| **With URLs** | Count where `airbnbUrl` exists | ✅ Correct |
| **Live Synced** | Count where `dataSources.scraped` exists | ✅ Correct |

### Portfolio Performance Banner
| Metric | Calculation | Status |
|--------|------------|--------|
| **Total Revenue** | Sum of all `property.metrics.revenue.value` | ⚠️ Issue: Double counts if value is object |
| **Total Nights** | Sum from CSV propertyMetrics | ⚠️ Only uses first metric per property |
| **Avg Rate** | `totalRevenue / totalNights` | ⚠️ Depends on above calculations |

## 2. Property Detail Page (`/property/[id]`)

### Metrics Dashboard Cards
| Card | Field | Status |
|------|-------|--------|
| **Revenue** | `metrics.revenue.value` | ✅ Fixed - Handles both number and object formats |
| **Occupancy** | `metrics.occupancy.value` | ✅ Fixed - Uses actual date ranges |
| **Avg Rate** | `metrics.pricing.value` | ✅ From CSV data |
| **Rating/Health** | Scraped rating or health score | ✅ Shows appropriate metric |

### Data Quality Alert
- Shows when date span > 1.5 years ✅
- Displays actual date range ✅
- Shows calculation basis (nights/days) ✅

### Insights Generation
| Insight Type | Data Source | Status |
|--------------|-------------|--------|
| **Revenue** | CSV propertyMetrics or metrics.revenue | ✅ Correct |
| **Occupancy** | Calculated from nights/date span | ✅ Fixed with proper date ranges |
| **Avg Nightly Rate** | CSV or calculated | ✅ Correct |
| **Recommendations** | Based on thresholds | ✅ Uses real data |

## 3. Data Flow Issues Found

### CSV Parser (`csv-parser.ts`)
| Component | Status | Notes |
|-----------|--------|-------|
| **Confirmation Code Grouping** | ✅ Fixed | Prevents 1.7x overcounting |
| **Date Sorting** | ✅ Fixed | Now uses Date objects instead of strings |
| **Revenue Calculation** | ✅ Fixed | Sums all payments per booking |
| **Nights Calculation** | ✅ Fixed | Takes value once per booking |
| **Date Range Validation** | ✅ Fixed | Swaps if end < start |

### Upload Processing (`/api/upload`)
| Process | Status | Notes |
|---------|--------|-------|
| **CSV to Property Mapping** | ✅ | Creates individual property objects |
| **Revenue Assignment** | ✅ | Each property gets its own revenue |
| **Nights Assignment** | ✅ | Each property gets its own nights |
| **Date Range** | ✅ | Passed through correctly |

### Session Storage Transform
| Field | Source | Target | Status |
|-------|--------|--------|--------|
| **revenue** | `prop.revenue \|\| prop.totalRevenue \|\| prop.netEarnings` | `metrics.revenue.value` | ✅ Fixed |
| **occupancy** | Calculated or from prop | `metrics.occupancy.value` | ✅ Added |
| **pricing** | `prop.avgNightlyRate` | `metrics.pricing.value` | ✅ Added |

## 4. Remaining Issues to Fix

### Critical
1. **Portfolio Total Revenue** - Line 683 in properties page
   - Issue: `sum + (p.metrics?.revenue?.value || 0)` doesn't handle object values
   - Fix needed: Check if value is object and extract nested value

2. **Total Nights Calculation** - Line 684-694 in properties page
   - Issue: Only uses first propertyMetrics entry
   - Fix needed: Sum all nights from propertyMetrics array

### Minor
3. **Health Score** - Generic calculation
   - Current: 80 if revenue > 0, else 40
   - Should be: Based on occupancy, revenue, and data completeness

4. **Date Range Display** - Line 817 in properties page
   - Issue: Calculates years incorrectly (divides days by 365 instead of 365.25)
   - Fix needed: Use proper year calculation

## 5. Data Accuracy Summary

### ✅ Working Correctly
- Individual property revenues in table
- Confirmation code deduplication
- Date range calculations with proper date objects
- Occupancy percentages with actual date spans
- Data source indicators
- Completeness tracking

### ⚠️ Needs Attention
- Portfolio total revenue calculation (object handling)
- Total nights aggregation (multiple metrics)
- Health score calculation (too simplistic)
- Year calculation in date range display

### 📊 Expected Results After All Fixes
- Properties show individual revenues: $239k, $234k, $127k, etc.
- Occupancy rates: 60-90% range (realistic)
- Portfolio totals accurately sum all properties
- Date ranges properly calculated and displayed