# Sample Data Structures for Testing

## 1. Sample Airbnb PDF Data Structure

```javascript
// This is what you'll extract from Airbnb monthly earnings PDF
const samplePDFData = {
  summary: {
    month: "January 2025",
    grossEarnings: 15234.56,
    serviceFees: 457.04,
    cleaningFees: 1200.00,
    occupancyTaxes: 892.34,
    netEarnings: 12685.18,
    totalNightsBooked: 47,
    totalReservations: 12
  },
  properties: [
    {
      name: "Luxury Downtown Loft - King Bed & City Views",
      address: "123 Main St, Austin, TX",
      grossEarnings: 8456.23,
      serviceFees: 253.69,
      netEarnings: 7302.54,
      nightsBooked: 22,
      reservations: 6,
      avgNightlyRate: 384.37,
      avgStayLength: 3.7
    },
    {
      name: "Cozy Studio Near Beach",
      address: "456 Ocean Ave, Santa Monica, CA",
      grossEarnings: 4567.89,
      serviceFees: 137.04,
      netEarnings: 3930.85,
      nightsBooked: 18,
      reservations: 4,
      avgNightlyRate: 253.77,
      avgStayLength: 4.5
    },
    {
      name: "Mountain Retreat Cabin",
      address: "789 Pine Rd, Aspen, CO",
      grossEarnings: 2210.44,
      serviceFees: 66.31,
      netEarnings: 1451.79,
      nightsBooked: 7,
      reservations: 2,
      avgNightlyRate: 315.78,
      avgStayLength: 3.5
    }
  ]
};
```

## 2. Sample Transaction CSV Structure

```javascript
// From Airbnb Transaction History export
const sampleCSVData = [
  {
    "Confirmation Code": "HMXYZ12345",
    "Start Date": "2025-01-15",
    "End Date": "2025-01-18",
    "Nights": 3,
    "Guest": "John D.", // Will be hashed
    "Listing": "Luxury Downtown Loft - King Bed & City Views",
    "Total Payout": 1234.56,
    "Cleaning Fee": 100.00,
    "Airbnb Service Fee": 37.04,
    "Occupancy Taxes": 72.34,
    "Gross Earnings": 1444.94,
    "Type": "Reservation",
    "Currency": "USD",
    "Status": "Completed"
  },
  {
    "Confirmation Code": "HMABC67890",
    "Start Date": "2025-01-20",
    "End Date": "2025-01-22",
    "Nights": 2,
    "Guest": "Sarah M.",
    "Listing": "Cozy Studio Near Beach",
    "Total Payout": 456.78,
    "Cleaning Fee": 75.00,
    "Airbnb Service Fee": 16.70,
    "Occupancy Taxes": 31.45,
    "Gross Earnings": 579.93,
    "Type": "Reservation",
    "Currency": "USD",
    "Status": "Completed"
  },
  {
    "Confirmation Code": "HMDEF11111",
    "Start Date": "2025-01-25",
    "End Date": "2025-01-27",
    "Nights": 2,
    "Guest": "Mike R.",
    "Listing": "Mountain Retreat Cabin",
    "Total Payout": 0,
    "Cleaning Fee": 0,
    "Airbnb Service Fee": 0,
    "Occupancy Taxes": 0,
    "Gross Earnings": 0,
    "Type": "Cancellation",
    "Currency": "USD",
    "Status": "Cancelled"
  }
];
```

## 3. Property Classification Examples

```javascript
const classifiedProperties = [
  {
    id: "prop_abc123",
    propertyHash: "a7b9c4d5e6f7",
    name: "Luxury Downtown Loft - King Bed & City Views",
    status: "active", // Had bookings this month
    healthScore: 92,
    lastBookingDate: new Date("2025-01-28"),
    monthsInactive: 0,
    totalRevenue: 45678.90,
    avgMonthlyRevenue: 7613.15,
    nightsBooked: 134,
    avgNightlyRate: 341.04,
    occupancyRate: 73.2,
    suggestedAction: "analyze",
    selectionPrice: 0 // First property free
  },
  {
    id: "prop_def456",
    propertyHash: "b8c9d4e5f6g8",
    name: "Cozy Studio Near Beach",
    status: "seasonal", // No bookings for 2 months
    healthScore: 68,
    lastBookingDate: new Date("2024-11-15"),
    monthsInactive: 2,
    totalRevenue: 23456.78,
    avgMonthlyRevenue: 3909.46,
    nightsBooked: 89,
    avgNightlyRate: 263.56,
    occupancyRate: 48.6,
    suggestedAction: "analyze",
    selectionPrice: 3.00 // Second property
  },
  {
    id: "prop_ghi789",
    propertyHash: "c9d0e5f6g7h9",
    name: "Mountain Retreat Cabin",
    status: "inactive", // No bookings for 4 months
    healthScore: 35,
    lastBookingDate: new Date("2024-09-20"),
    monthsInactive: 4,
    totalRevenue: 12345.67,
    avgMonthlyRevenue: 2057.61,
    nightsBooked: 42,
    avgNightlyRate: 294.18,
    occupancyRate: 23.0,
    suggestedAction: "skip",
    selectionPrice: 3.00 // Third property
  },
  {
    id: "prop_jkl012",
    propertyHash: "d0e1f6g7h8i0",
    name: "Old Listing - Sunset Villa",
    status: "expired", // No bookings for 8+ months
    healthScore: 0,
    lastBookingDate: new Date("2024-05-10"),
    monthsInactive: 8,
    totalRevenue: 8901.23,
    avgMonthlyRevenue: 0,
    nightsBooked: 28,
    avgNightlyRate: 317.90,
    occupancyRate: 0,
    suggestedAction: "archive",
    selectionPrice: 3.00 // Fourth property
  }
];
```

## 4. AI Enhancement Requests

```javascript
const enhancementRequests = {
  propertyId: "prop_abc123",
  propertyName: "Luxury Downtown Loft",
  gaps: [
    {
      type: "listing_url",
      priority: "critical",
      reason: "Cannot analyze listing quality, photos, or amenities without the listing URL",
      potentialImpact: "Unlock 15+ optimization opportunities and competitive analysis",
      howToGet: "Copy the URL from your Airbnb listing page",
      expectedData: {
        url: "https://www.airbnb.com/rooms/12345678",
        scrapedData: {
          title: "Luxury Downtown Loft - King Bed & City Views",
          photos: 25,
          amenities: ["WiFi", "Kitchen", "Air conditioning", "Parking"],
          rating: 4.92,
          reviews: 127,
          superhost: true
        }
      }
    },
    {
      type: "calendar",
      priority: "important",
      reason: "Missing future booking data for revenue forecasting",
      potentialImpact: "Enable 90-day revenue predictions and identify booking gaps",
      howToGet: "Export .ics file from Airbnb: Calendar → Availability Settings → Export Calendar",
      expectedData: {
        filename: "airbnb-calendar.ics",
        futureBookings: 8,
        blockedDates: 12,
        nextAvailable: "2025-02-15"
      }
    },
    {
      type: "competitors",
      priority: "nice_to_have",
      reason: "No competitive benchmarking available",
      potentialImpact: "Optimize pricing strategy, potentially increase revenue by 15-20%",
      howToGet: "Share 3-5 URLs of similar listings in your area",
      expectedData: {
        competitors: [
          "https://www.airbnb.com/rooms/98765432",
          "https://www.airbnb.com/rooms/87654321",
          "https://www.airbnb.com/rooms/76543210"
        ]
      }
    }
  ],
  completeness: 40 // Base completeness with just financial data
};
```

## 5. Gemini AI Response Examples

```javascript
const geminiResponse = {
  insights: [
    {
      type: "positive",
      category: "revenue",
      title: "Strong Revenue Performance",
      description: "Your property generated $8,456 last month, 23% above market average for similar properties",
      confidence: 92
    },
    {
      type: "negative",
      category: "occupancy",
      title: "Declining Occupancy Trend",
      description: "Occupancy dropped from 78% to 65% over the past 3 months, indicating potential issues",
      confidence: 88
    },
    {
      type: "neutral",
      category: "competitive",
      title: "New Competition Detected",
      description: "3 new similar listings appeared in your area last month, which may impact future bookings",
      confidence: 75
    }
  ],
  recommendations: [
    {
      priority: "high",
      category: "pricing",
      action: "Reduce minimum stay requirement from 3 to 2 nights",
      impact: "Could increase bookings by 25-30%",
      effort: "low",
      estimatedValue: 1500,
      timeframe: "Immediate"
    },
    {
      priority: "medium",
      category: "listing",
      action: "Add 5 more photos showcasing amenities",
      impact: "Improve click-through rate by 15%",
      effort: "medium",
      estimatedValue: 800,
      timeframe: "This week"
    },
    {
      priority: "low",
      category: "amenities",
      action: "Provide coffee machine and mention in listing",
      impact: "Improve guest satisfaction scores",
      effort: "low",
      estimatedValue: 200,
      timeframe: "This month"
    }
  ],
  opportunities: [
    {
      action: "Increase weekend rates by $25",
      impact: 600,
      unit: "month",
      effort: "low"
    },
    {
      action: "Enable instant booking",
      impact: 1200,
      unit: "month",
      effort: "low"
    }
  ],
  alerts: [
    {
      type: "warning",
      title: "Review Score Declining",
      message: "Your cleanliness score dropped from 4.9 to 4.6 in recent reviews",
      action: "Review and update cleaning checklist"
    }
  ],
  confidence: 85
};
```

## 6. Pricing Calculation Examples

```javascript
const pricingCalculation = {
  selectedProperties: 5,
  breakdown: [
    {
      min: 1,
      max: 1,
      price: 0, // First free
      count: 1,
      subtotal: 0,
      label: "First property FREE (new user bonus)"
    },
    {
      min: 2,
      max: 5,
      price: 3,
      count: 4,
      subtotal: 12,
      label: "Properties 2-5 ($3 each)"
    }
  ],
  total: 12,
  perProperty: 2.40,
  suggestUnlimited: false,
  unlimitedPrice: 49,
  savings: 0,
  isMonthly: false
};

// Monthly subscription pricing
const monthlyPricing = {
  selectedProperties: 5,
  plans: [
    {
      id: "active-only",
      name: "Active Properties",
      propertyCount: 3,
      basePrice: 36,
      discount: 0,
      finalPrice: 36,
      badge: "RECOMMENDED",
      features: [
        "Monthly reports",
        "Email alerts",
        "Trend analysis",
        "AI insights"
      ],
      projectedValue: 450
    },
    {
      id: "all-properties",
      name: "Complete Portfolio",
      propertyCount: 5,
      basePrice: 60,
      discount: 9,
      finalPrice: 51,
      badge: "BEST VALUE",
      features: [
        "All active properties features",
        "API access",
        "White-label reports",
        "Priority support"
      ],
      projectedValue: 750
    }
  ]
};
```

## 7. Dashboard Data Structure

```javascript
const dashboardData = {
  user: {
    id: "user_123",
    email: "host@example.com",
    name: "John Host",
    subscription: {
      planType: "growth",
      status: "active",
      propertyCount: 3,
      monthlyPrice: 36
    },
    credits: 5
  },
  metrics: {
    totalProperties: 5,
    activeProperties: 3,
    portfolioRevenue: 123456.78,
    avgHealthScore: 72,
    lastAnalysis: new Date("2025-01-15"),
    monthlyGrowth: 12.5,
    occupancyTrend: "increasing"
  },
  properties: [
    // Array of properties with analysis data
  ],
  recentAnalyses: [
    {
      id: "analysis_123",
      propertyName: "Luxury Downtown Loft",
      completedAt: new Date("2025-01-15"),
      insights: 8,
      recommendations: 5,
      reportUrl: "/reports/analysis_123.pdf"
    }
  ],
  notifications: [
    {
      id: "notif_1",
      type: "success",
      title: "Analysis Complete",
      message: "Your property analysis is ready to view",
      actionUrl: "/analyze/prop_abc123",
      actionLabel: "View Report",
      read: false,
      createdAt: new Date("2025-01-15T10:30:00")
    }
  ],
  chartData: {
    revenue: {
      labels: ["Oct", "Nov", "Dec", "Jan"],
      datasets: [{
        label: "Portfolio Revenue",
        data: [28500, 31200, 35600, 41234],
        borderColor: "#FF5A5F",
        tension: 0.4
      }]
    },
    occupancy: {
      labels: ["Oct", "Nov", "Dec", "Jan"],
      datasets: [{
        label: "Average Occupancy",
        data: [72, 68, 75, 78],
        backgroundColor: "#00A699"
      }]
    }
  }
};
```

## 8. Error States

```javascript
const errorStates = {
  uploadError: {
    code: "PARSE_ERROR",
    message: "Unable to parse PDF. The format may have changed.",
    details: {
      file: "earnings-january.pdf",
      line: 145,
      expected: "Gross earnings:",
      found: "Total revenue:"
    },
    statusCode: 422,
    recoverable: true,
    fallbackAction: "Try uploading the CSV transaction history instead"
  },
  
  scrapingError: {
    code: "SCRAPING_FAILED",
    message: "Unable to analyze listing page",
    details: {
      url: "https://www.airbnb.com/rooms/12345678",
      reason: "Rate limited"
    },
    statusCode: 429,
    recoverable: true,
    fallbackAction: "Please try again in a few minutes or enter data manually"
  },
  
  paymentError: {
    code: "PAYMENT_FAILED",
    message: "Payment could not be processed",
    details: {
      reason: "Card declined",
      stripeError: "insufficient_funds"
    },
    statusCode: 402,
    recoverable: true,
    fallbackAction: "Please try a different payment method"
  }
};
```

## 9. Test File Names and Paths

```javascript
const testFiles = {
  pdfs: [
    "test-data/airbnb-earnings-january-2025.pdf",
    "test-data/airbnb-earnings-annual-2024.pdf",
    "test-data/corrupted-earnings.pdf", // For error testing
    "test-data/empty-earnings.pdf" // No properties
  ],
  
  csvs: [
    "test-data/transaction-history-2025.csv",
    "test-data/transaction-history-large.csv", // 1000+ rows
    "test-data/malformed-transactions.csv", // Missing columns
    "test-data/empty-transactions.csv"
  ],
  
  calendars: [
    "test-data/calendar-busy.ics", // Many bookings
    "test-data/calendar-empty.ics", // No bookings
    "test-data/calendar-blocked.ics" // Owner blocked dates
  ]
};
```

## 10. Mock API Responses

```javascript
// Mock Stripe checkout session
const mockCheckoutSession = {
  id: "cs_test_123456789",
  object: "checkout.session",
  payment_status: "unpaid",
  url: "https://checkout.stripe.com/c/pay/cs_test_123456789",
  success_url: "http://localhost:3001/success",
  cancel_url: "http://localhost:3001/cancel",
  metadata: {
    userId: "user_123",
    propertyIds: "prop_abc123,prop_def456",
    analysisType: "one_time"
  }
};

// Mock webhook payload
const mockWebhook = {
  id: "evt_123456789",
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_123456789",
      payment_status: "paid",
      metadata: {
        userId: "user_123",
        sessionId: "session_123",
        propertyIds: "prop_abc123,prop_def456"
      }
    }
  }
};
```