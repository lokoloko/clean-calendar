export const sampleCSVData = `Date,Type,Confirmation Code,Start Date,Nights,Guest,Listing,Details,Reference,Currency,Amount,Paid Out,Service Fee,Host Fee
2024-01-15,Reservation,HMXYZ123,2024-01-20,3,John Doe,Beach House Studio,,"",USD,450.00,405.00,,45.00
2024-01-16,Reservation,HMABC456,2024-01-25,2,Jane Smith,Mountain View Cabin,,"",USD,300.00,270.00,,30.00
2024-01-17,Payout,,,,,,,PAY123,USD,,405.00,,
2024-01-20,Reservation,HMDEF789,2024-02-01,4,Bob Johnson,Beach House Studio,,"",USD,600.00,540.00,,60.00
2024-01-25,Reservation,HMGHI012,2024-02-10,3,Alice Brown,Mountain View Cabin,,"",USD,450.00,405.00,,45.00
2024-02-01,Payout,,,,,,,PAY456,USD,,1485.00,,
2024-02-05,Reservation,HMJKL345,2024-02-15,5,Charlie Wilson,Beach House Studio,,"",USD,750.00,675.00,,75.00
2024-02-10,Reservation,HMMNO678,2024-02-20,2,Diana Lee,Mountain View Cabin,,"",USD,300.00,270.00,,30.00`

export const sampleProperties = [
  {
    id: 'prop-1',
    name: 'Beach House Studio',
    address: '123 Ocean Drive, Beach City, CA 90210',
    url: 'https://airbnb.com/rooms/123456',
    revenue: 1800,
    bookings: 3,
    occupancy: 75,
    avgNightlyRate: 150,
    avgStayLength: 4,
    totalReviews: 45,
    avgRating: 4.8,
  },
  {
    id: 'prop-2',
    name: 'Mountain View Cabin',
    address: '456 Pine Ridge Road, Mountain Town, CO 80301',
    url: 'https://airbnb.com/rooms/789012',
    revenue: 1050,
    bookings: 3,
    occupancy: 60,
    avgNightlyRate: 150,
    avgStayLength: 2.3,
    totalReviews: 32,
    avgRating: 4.6,
  },
]

export const sampleMonthlyData = [
  {
    month: '2024-01',
    revenue: 1350,
    bookings: 3,
    avgNightlyRate: 150,
    occupancy: 70,
  },
  {
    month: '2024-02',
    revenue: 1500,
    bookings: 3,
    avgNightlyRate: 150,
    occupancy: 65,
  },
]

export const sampleAIInsights = {
  performance: {
    score: 82,
    level: 'Above Average',
    summary: 'Your portfolio is performing well with strong occupancy rates and consistent bookings.',
  },
  opportunities: [
    {
      title: 'Optimize Weekend Pricing',
      impact: 'high',
      description: 'Increase weekend rates by 15-20% based on local demand patterns',
      estimatedRevenue: '+$300/month',
    },
    {
      title: 'Improve Listing Photos',
      impact: 'medium',
      description: 'Professional photography could increase bookings by 10-15%',
      estimatedRevenue: '+$200/month',
    },
    {
      title: 'Add Instant Book',
      impact: 'medium',
      description: 'Enable instant booking to capture more spontaneous travelers',
      estimatedRevenue: '+$150/month',
    },
  ],
  risks: [
    {
      title: 'Seasonal Demand Drop',
      severity: 'medium',
      description: 'Winter months show 30% lower occupancy',
      mitigation: 'Consider offering winter promotions or longer stay discounts',
    },
    {
      title: 'Increasing Competition',
      severity: 'low',
      description: '5 new similar properties listed in your area',
      mitigation: 'Focus on unique amenities and superior guest experience',
    },
  ],
  recommendations: [
    {
      priority: 1,
      action: 'Adjust pricing strategy',
      timeline: 'Immediate',
      effort: 'Low',
      impact: 'High',
      details: 'Implement dynamic pricing with 20% premium on weekends and holidays',
    },
    {
      priority: 2,
      action: 'Enhance property amenities',
      timeline: '1-2 months',
      effort: 'Medium',
      impact: 'Medium',
      details: 'Add high-speed WiFi details, workspace setup, and local guidebook',
    },
    {
      priority: 3,
      action: 'Improve response time',
      timeline: 'Immediate',
      effort: 'Low',
      impact: 'Medium',
      details: 'Aim for <1 hour response time to increase booking conversion',
    },
  ],
}

export const mockGeminiResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              analysis: {
                marketPosition: 'above-average',
                competitiveAdvantages: [
                  'Prime location near beach',
                  'Consistent 4.8+ ratings',
                  'Competitive pricing',
                ],
                improvementAreas: [
                  'Limited amenities compared to competitors',
                  'No professional photography',
                  'Missing instant book feature',
                ],
                predictedTrends: {
                  nextMonth: {
                    occupancy: 72,
                    revenue: 1650,
                    confidence: 0.75,
                  },
                  nextQuarter: {
                    occupancy: 68,
                    revenue: 4800,
                    confidence: 0.65,
                  },
                },
              },
            }),
          },
        ],
      },
    },
  ],
}

export const createMockFile = (content: string, filename: string, mimeType: string): File => {
  const blob = new Blob([content], { type: mimeType })
  return new File([blob], filename, { type: mimeType })
}

export const createMockFormData = (files: File[]): FormData => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  return formData
}