# CSV Format Validation Tool Specification

## Overview
This document specifies a validation tool to detect when Airbnb changes their CSV export format, preventing data processing errors and maintaining system reliability.

## Problem Statement
Airbnb may change their CSV export format at any time without notice. Our current system depends on specific column names, data formats, and patterns. Any unexpected changes could cause:
- Silent data corruption
- Incorrect metric calculations
- System crashes
- User frustration

## Current CSV Format Understanding

### Schema Definition (v1.0 - December 2024)

#### Column Structure (23 columns)
| Column Name | Required | Data Type | Format | Purpose |
|------------|----------|-----------|---------|---------|
| Date | Yes | Date | MM/DD/YYYY | Transaction date |
| Arriving by date | No | Date | MM/DD/YYYY | Payment arrival date |
| Type | Yes | Enum | Text | Transaction type |
| Confirmation code | Conditional | String | Alphanumeric | Booking identifier |
| Booking date | No | Date | MM/DD/YYYY | When reservation made |
| Start date | Conditional | Date | MM/DD/YYYY | Check-in date |
| End date | Conditional | Date | MM/DD/YYYY | Check-out date |
| Nights | Conditional | Integer | Number | Total stay duration |
| Guest | Conditional | String | Text | Guest name |
| Listing | Yes | String | Text | Property name |
| Details | No | String | Text | Transaction details |
| Reference code | No | String | Alphanumeric | Payment reference |
| Currency | Yes | String | 3-letter code | Currency code |
| Amount | Conditional | Currency | $X,XXX.XX | Transaction amount |
| Paid out | Conditional | Currency | $X,XXX.XX | Payout amount |
| Service fee | No | Currency | $X,XXX.XX | Airbnb fee |
| Fast pay fee | No | Currency | $X,XXX.XX | Express payment fee |
| Cleaning fee | No | Currency | $X,XXX.XX | Cleaning charge |
| Linens fee | No | Currency | $X,XXX.XX | Linens charge |
| Pet fee | No | Currency | $X,XXX.XX | Pet charge |
| Gross earnings | Conditional | Currency | $X,XXX.XX | Total earnings |
| Occupancy taxes | No | Currency | $X,XXX.XX | Tax amount |
| Earnings year | No | Integer | YYYY | Tax year |

#### Transaction Types
- `Reservation` - Guest bookings
- `Payout` - Host payments
- `Co-Host payout` - Co-host payments
- `Resolution Adjustment` - Refunds/adjustments

### Critical Dependencies

#### 1. Confirmation Code Pattern
- **Purpose**: Group multiple payment rows for single bookings
- **Pattern**: Alphanumeric, typically 10 characters
- **Critical**: Without this, we can't deduplicate long-term bookings

#### 2. Nights Field Behavior
- **Current**: Contains TOTAL nights for entire stay
- **Risk**: Could change to monthly nights for installment payments
- **Impact**: Would cause massive undercounting

#### 3. Date Formats
- **Current**: MM/DD/YYYY
- **Risk**: Could change to ISO format (YYYY-MM-DD)
- **Impact**: Parsing failures, incorrect date ranges

#### 4. Amount Formats
- **Current**: $X,XXX.XX with commas and dollar signs
- **Risk**: Could remove symbols or change decimal separator
- **Impact**: Revenue calculation errors

## Validation Rules

### Level 1: Structure Validation (Critical)

```yaml
structure_rules:
  required_columns:
    - Date
    - Type
    - Listing
    - Currency
  
  conditional_requirements:
    - if: Type == "Reservation"
      then_required:
        - Confirmation code
        - Start date
        - End date
        - Nights
        - Gross earnings
    
    - if: Type == "Payout"
      then_required:
        - Paid out
        - Reference code
  
  column_count:
    expected: 23
    tolerance: ±2  # Allow minor variations
```

### Level 2: Format Validation (Critical)

```yaml
format_rules:
  date_columns:
    pattern: "^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/\\d{4}$"
    columns:
      - Date
      - Booking date
      - Start date
      - End date
      - Arriving by date
  
  amount_columns:
    pattern: "^\\$?[0-9]{1,3}(,[0-9]{3})*\\.?[0-9]{0,2}$"
    columns:
      - Amount
      - Paid out
      - Gross earnings
      - Service fee
      - Cleaning fee
  
  integer_columns:
    pattern: "^[0-9]+$"
    columns:
      - Nights
      - Earnings year
```

### Level 3: Business Logic Validation (Warning)

```yaml
business_rules:
  confirmation_codes:
    - min_length: 8
    - max_length: 15
    - required_for: "Reservation"
    - uniqueness: "May repeat for multi-payment bookings"
  
  nights_values:
    - min: 1
    - max: 365
    - warning_if_all: "< 31"  # Might indicate format change
  
  date_logic:
    - end_date >= start_date
    - booking_date <= start_date
    - date <= arriving_by_date
  
  amount_logic:
    - gross_earnings > 0 for Reservations
    - paid_out > 0 for Payouts
    - service_fee <= gross_earnings * 0.20  # Max 20% fee
```

### Level 4: Anomaly Detection (Info)

```yaml
anomaly_patterns:
  duplicate_confirmation_rate:
    expected: "5-10%"  # Long-term bookings
    alert_if: "> 50%"  # Too many duplicates
  
  missing_confirmation_rate:
    expected: "< 1%"
    alert_if: "> 10%"
  
  nights_distribution:
    expected_median: "2-5"
    alert_if_median: "> 30"  # Possible monthly values
  
  new_transaction_types:
    action: "Log and monitor"
    alert_if: "Affects > 5% of rows"
  
  column_additions:
    action: "Log for review"
    severity: "Info unless breaks parser"
```

## Alert Classifications

### 🔴 Critical Alerts (Block Processing)
- Missing required columns
- Unrecognized date format
- No transaction type column
- Parser crashes

**Example Messages:**
```
🔴 CRITICAL: Column "Confirmation code" not found
   Impact: Cannot group multi-payment bookings
   Action: Contact support or update parser

🔴 CRITICAL: Date format changed from MM/DD/YYYY
   Found: 2024-12-25 (ISO format)
   Action: Update date parsing logic
```

### 🟡 Warning Alerts (Allow with Caution)
- New columns detected
- Unusual data patterns
- Missing optional columns
- Business rule violations

**Example Messages:**
```
🟡 WARNING: New column "Tax Registration" detected
   Position: Column 24
   Action: Review if processing needed

🟡 WARNING: 85% of Nights values are < 31
   Risk: Format may have changed to monthly
   Action: Verify with sample bookings
```

### 🟢 Info Alerts (Log Only)
- New transaction types
- Minor pattern variations
- Performance metrics
- Statistical anomalies

**Example Messages:**
```
🟢 INFO: New transaction type "Damage reimbursement"
   Frequency: 2 occurrences
   Action: Currently ignored in processing

🟢 INFO: Column order changed but all present
   Action: No action needed
```

## Implementation Strategy

### Phase 1: Detection (Immediate)
- Validate column headers
- Check basic formats
- Alert on critical issues

### Phase 2: Analysis (Short-term)
- Pattern recognition
- Anomaly detection
- Trend analysis

### Phase 3: Adaptation (Long-term)
- Auto-mapping new columns
- Format migration
- Self-healing parsers

## Testing Scenarios

### Test Case 1: Column Removed
```csv
Date,Type,Listing,Currency,Amount  # Missing "Confirmation code"
```
**Expected**: 🔴 Critical alert

### Test Case 2: Format Change
```csv
2024-12-25,Reservation,Unit 1,USD,100.00  # ISO date format
```
**Expected**: 🔴 Critical alert

### Test Case 3: New Column
```csv
Date,...,Tax ID  # Extra column added
```
**Expected**: 🟡 Warning alert

### Test Case 4: Pattern Change
```csv
Nights: 30, 30, 28, 31, 30  # All monthly values
```
**Expected**: 🟡 Warning alert

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Detection Speed | < 1 second | Time to identify format issues |
| False Positive Rate | < 5% | Incorrect alerts / total alerts |
| Format Coverage | > 95% | Known formats handled / total formats |
| User Understanding | > 90% | Users who fix issues without support |
| Silent Failures | 0 | Undetected format changes causing errors |

## Migration Path

When Airbnb changes their format:

1. **Detection**: Tool alerts on first upload
2. **Analysis**: System provides detailed report
3. **Mapping**: User or system maps old→new columns
4. **Validation**: Test with sample data
5. **Migration**: Update parser with new rules
6. **Monitoring**: Track for additional issues

## Future Enhancements

### Machine Learning Integration
- Learn normal patterns from successful uploads
- Predict format changes before they cause issues
- Auto-generate parsing rules

### Multi-Version Support
- Maintain parsers for multiple CSV versions
- Auto-detect version from structure
- Seamless handling of old exports

### Community Sharing
- Share format changes with other users
- Crowdsource validation rules
- Build format change database

## Conclusion

This validation tool serves as a critical safeguard against CSV format changes. By implementing these validation rules and alert systems, we can:
- Prevent silent data corruption
- Provide clear guidance to users
- Maintain system reliability
- Adapt quickly to format changes

The tool transforms a potential crisis (unexpected format change) into a manageable event with clear actions and outcomes.