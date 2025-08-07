# PDF Parsing Limitations - IMPORTANT

## The Problem with Airbnb's Performance Stats Format

Airbnb concatenates property performance data without delimiters:
```
"Unit 133210.4"
```

This SHOULD mean:
- Property: "Unit 1"
- Nights: 332
- Avg Stay: 10.4

But it could also mean:
- "Unit 13" + 32 nights + 10.4 avg
- "Unit 133" + 2 nights + 10.4 avg

**Without knowing exact property name lengths, we CANNOT parse this reliably.**

## What We Were Doing Wrong

### Nights Extraction (WRONG):
- Extracting: 10 nights from "33210.4" 
- Reality: Should be 332 nights!
- Off by 30x+!

### Average Stay (WRONG):  
- Extracting: 0.4 from "10.4"
- Reality: Should be 10.4 nights average!
- Only getting the decimal part!

## Our Solution

### 1. Disabled Broken Extraction
- Removed all property-specific nights parsing
- Removed all property-specific average stay parsing
- Added clear code comments explaining why

### 2. Use Reliable Data Only
- **Total Nights**: 3,645 (accurate from PDF summary)
- **Global Avg Stay**: 7.9 nights (accurate from PDF summary)
- **Individual Nights**: Estimated from revenue (with disclaimer)
- **Individual Avg Stay**: Shows portfolio average (with disclaimer)

### 3. UI Transparency
- Added * to "Nights" column with tooltip
- Added ** to "Avg Stay" column with tooltip
- Clear footnotes explaining the limitations

## What This Means for Users

### Accurate Data:
- ✅ Total revenue (all types)
- ✅ Total nights booked (portfolio)
- ✅ Global average stay (portfolio)
- ✅ Monthly breakdown
- ✅ Tax information

### Estimated Data:
- ⚠️ Individual property nights (revenue-based estimate)
- ⚠️ Individual property avg stay (shows portfolio average)

## Why This Matters

**Data Integrity > False Precision**

It's better to be honest about limitations than to show wildly incorrect data. Users can still:
- See accurate portfolio metrics
- Understand property revenue performance
- Make decisions based on reliable totals
- Know exactly what's estimated vs actual

## Future Improvement

If Airbnb ever adds delimiters or provides CSV export with this data, we can parse accurately. Until then, we're transparent about what we can and cannot extract reliably.