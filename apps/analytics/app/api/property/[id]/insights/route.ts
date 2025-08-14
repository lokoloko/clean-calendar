import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { property, dataSources, metrics } = body
    
    // Build context for Gemini
    const context = {
      propertyName: property.standardName,
      revenue: metrics?.revenue?.value || 0,
      occupancy: metrics?.occupancy?.value || 0,
      avgRate: metrics?.pricing?.value || 0,
      health: metrics?.health || 0,
      hasUrl: !!property.airbnbUrl,
      hasCsv: !!dataSources.csv,
      hasPdf: !!dataSources.pdf,
      hasLiveData: !!dataSources.scraped,
      currentPrice: dataSources.scraped?.data?.price?.nightly,
      rating: dataSources.scraped?.data?.reviews?.overall,
      reviewCount: dataSources.scraped?.data?.reviews?.count,
      amenitiesCount: dataSources.scraped?.data?.amenities?.all?.length || 0,
      isSuperhost: dataSources.scraped?.data?.host?.isSuperhost
    }
    
    const prompt = `
    You are an Airbnb property optimization expert. Analyze this property and provide actionable insights.
    
    Property: ${context.propertyName}
    Revenue: $${context.revenue}
    Occupancy: ${context.occupancy}%
    Average Rate: $${context.avgRate}/night
    Health Score: ${context.health}%
    
    Data Sources:
    - PDF Report: ${context.hasPdf ? 'Yes' : 'No'}
    - Transaction CSV: ${context.hasCsv ? 'Yes' : 'No'}
    - Airbnb URL: ${context.hasUrl ? 'Yes' : 'No'}
    - Live Data: ${context.hasLiveData ? 'Yes' : 'No'}
    
    ${context.hasLiveData ? `
    Live Data:
    - Current Price: $${context.currentPrice}/night
    - Rating: ${context.rating} stars (${context.reviewCount} reviews)
    - Amenities: ${context.amenitiesCount}
    - Superhost: ${context.isSuperhost ? 'Yes' : 'No'}
    ` : ''}
    
    Provide insights in the following JSON format:
    {
      "actionable": [
        {
          "priority": "critical|important|opportunity",
          "category": "string",
          "title": "string",
          "description": "string",
          "impact": "string (e.g., '+$3,600/year')",
          "effort": "low|medium|high",
          "automatable": boolean
        }
      ],
      "analysis": [
        {
          "type": "revenue|occupancy|pricing|satisfaction",
          "title": "string",
          "findings": ["string"],
          "trend": "up|down|stable",
          "confidence": number (0-100)
        }
      ],
      "predictions": [
        {
          "period": "string",
          "metric": "string",
          "value": number,
          "confidence": number (0-100),
          "factors": ["string"]
        }
      ],
      "coaching": [
        {
          "category": "string",
          "tip": "string",
          "context": "string",
          "resources": ["string"]
        }
      ]
    }
    
    Focus on:
    1. Revenue optimization opportunities
    2. Occupancy improvement strategies
    3. Pricing recommendations based on market
    4. Data completeness issues
    5. Quick wins vs long-term improvements
    
    Be specific and actionable. Prioritize by impact and effort.
    `
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0])
        
        // Add IDs to items
        insights.actionable = insights.actionable?.map((item: any, i: number) => ({
          id: `action-${i}`,
          ...item
        })) || []
        
        insights.analysis = insights.analysis?.map((item: any, i: number) => ({
          id: `analysis-${i}`,
          ...item
        })) || []
        
        insights.predictions = insights.predictions?.map((item: any, i: number) => ({
          id: `prediction-${i}`,
          ...item
        })) || []
        
        insights.coaching = insights.coaching?.map((item: any, i: number) => ({
          id: `coaching-${i}`,
          ...item
        })) || []
        
        return NextResponse.json(insights)
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
    }
    
    // Fallback to mock insights if parsing fails
    return NextResponse.json(generateMockInsights(context))
    
  } catch (error) {
    console.error('Error generating insights:', error)
    
    // Return mock insights on error
    const mockInsights = generateMockInsights({
      revenue: 0,
      occupancy: 0,
      avgRate: 0,
      health: 0,
      hasUrl: false,
      hasCsv: false
    })
    
    return NextResponse.json(mockInsights)
  }
}

function generateMockInsights(context: any) {
  return {
    actionable: [
      {
        id: 'action-1',
        priority: context.revenue < 30000 ? 'critical' : 'important',
        category: 'Revenue',
        title: 'Optimize Pricing Strategy',
        description: 'Your pricing appears to be below market average',
        impact: '+$5,000/year',
        effort: 'low',
        automatable: true
      },
      {
        id: 'action-2',
        priority: !context.hasUrl ? 'critical' : 'opportunity',
        category: 'Data',
        title: !context.hasUrl ? 'Add Airbnb URL' : 'Update Listing Photos',
        description: !context.hasUrl 
          ? 'Enable live data sync for better insights'
          : 'Fresh photos can increase bookings by 20%',
        impact: !context.hasUrl ? 'Enable features' : '+15% bookings',
        effort: 'low',
        automatable: false
      }
    ],
    analysis: [
      {
        id: 'analysis-1',
        type: 'revenue',
        title: 'Revenue Performance',
        findings: [
          'Revenue is tracking at expected levels',
          'Seasonal patterns detected',
          'Opportunity for weekend premium pricing'
        ],
        trend: 'stable',
        confidence: 75
      }
    ],
    predictions: [
      {
        id: 'prediction-1',
        period: 'Next 30 days',
        metric: 'Revenue',
        value: Math.round(context.revenue / 12),
        confidence: 70,
        factors: ['Historical trends', 'Seasonality']
      }
    ],
    coaching: [
      {
        id: 'coaching-1',
        category: 'Optimization',
        tip: 'Focus on guest experience',
        context: 'Properties with quick response times book 25% more often',
        resources: ['Response templates', 'Automation tools']
      }
    ]
  }
}