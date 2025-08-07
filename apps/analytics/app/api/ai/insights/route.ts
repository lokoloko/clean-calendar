import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Get Gemini API key from server environment
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    
    if (!geminiKey) {
      console.log('Gemini API key not found in server environment')
      // Return mock insights if no API key
      return NextResponse.json(generateMockInsights(data))
    }
    
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const prompt = `
      Analyze this Airbnb portfolio data and provide comprehensive actionable insights:
      
      Portfolio Summary:
      - Total Revenue: $${data.totalRevenue}
      - Active Properties: ${data.activeProperties}
      - Inactive Properties: ${data.inactiveProperties}
      - Total Nights Booked: ${data.totalNights || 'N/A'}
      - Average Nights per Property: ${data.totalNights ? (data.totalNights / Math.max(data.activeProperties, 1)).toFixed(1) : 'N/A'}
      - Date Range: ${data.dateRange || 'Current period'}
      
      Properties Performance:
      ${data.properties.map((p: any) => 
        `- ${p.name}: $${p.revenue} revenue, ${p.nightsBooked} nights, ${p.avgNightStay || 3} avg stay, health score ${p.healthScore || 'N/A'}, status: ${p.status}`
      ).join('\n')}
      
      Please provide comprehensive insights including:
      1. Top 5 critical issues that need immediate attention (focus on inactive properties, low revenue, occupancy problems)
      2. Top 5 optimization opportunities (pricing, marketing, seasonal adjustments, property improvements)
      3. 3-4 market trends or patterns you notice (location-based, seasonal, property type patterns)
      4. Specific actionable recommendations for each inactive property
      5. Portfolio-wide strategic recommendations
      6. Risk assessments (revenue concentration, seasonal dependency, market saturation)
      
      Make insights specific, quantified, and actionable. Include estimated impact in dollars or percentage where possible.
      
      Format as JSON with structure:
      {
        "criticalIssues": [{"title": "", "description": "", "impact": "", "priority": "high/medium/low"}],
        "opportunities": [{"title": "", "description": "", "impact": "", "timeframe": "immediate/short-term/long-term"}],
        "patterns": [{"title": "", "description": "", "trend": "positive/negative/neutral"}],
        "recommendations": [{"property": "", "action": "", "expectedResult": ""}],
        "strategicAdvice": [{"category": "", "advice": "", "benefit": ""}],
        "risks": [{"type": "", "description": "", "mitigation": ""}]
      }
      `
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Parse JSON from response
      try {
        // Clean up the response - remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const insights = JSON.parse(jsonMatch[0])
          console.log('Successfully generated Gemini insights')
          return NextResponse.json(insights)
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError)
        console.log('Raw response:', text)
      }
      
      // Fallback to mock if parsing fails
      return NextResponse.json(generateMockInsights(data))
      
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError)
      return NextResponse.json(generateMockInsights(data))
    }
    
  } catch (error) {
    console.error('Insights API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

function generateMockInsights(data: any) {
  const insights: any = {
    criticalIssues: [],
    opportunities: [],
    patterns: [],
    recommendations: []
  }
  
  // Generate insights based on data
  if (data.inactiveProperties > 0) {
    insights.criticalIssues.push({
      title: `${data.inactiveProperties} Inactive Properties`,
      description: `${data.inactiveProperties} properties generated no revenue this month`,
      impact: `Potential monthly loss: $${(data.totalRevenue / Math.max(data.activeProperties, 1) * data.inactiveProperties).toFixed(0)}`
    })
    
    insights.recommendations.push({
      property: 'Inactive properties',
      action: 'Review listing status and pricing strategy'
    })
  }
  
  const avgRevenue = data.totalRevenue / Math.max(data.activeProperties, 1)
  if (avgRevenue < 2000) {
    insights.opportunities.push({
      title: 'Revenue Optimization',
      description: `Average property revenue is $${avgRevenue.toFixed(0)}`,
      impact: 'Properties could increase by 20-30% with optimization'
    })
  }
  
  // Check for low occupancy
  const avgNights = data.totalNights / Math.max(data.activeProperties, 1)
  if (avgNights < 15) {
    insights.criticalIssues.push({
      title: 'Low Occupancy Rate',
      description: `Average ${avgNights.toFixed(1)} nights per property`,
      impact: 'Missing 50% of potential bookings'
    })
  }
  
  // Add patterns
  if (data.properties && data.properties.length > 5) {
    insights.patterns.push({
      title: 'Portfolio Size',
      description: 'Large enough portfolio for professional management tools'
    })
  }
  
  // Add more opportunities
  insights.opportunities.push({
    title: 'Seasonal Pricing',
    description: 'Implement dynamic pricing based on local events',
    impact: '10-15% revenue increase potential'
  })
  
  return insights
}