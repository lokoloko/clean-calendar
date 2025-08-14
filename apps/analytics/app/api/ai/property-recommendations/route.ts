import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { properties, marketContext } = await request.json()
    
    // Get Gemini API key from server environment
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    
    if (!geminiKey) {
      console.log('Gemini API key not found, using fallback recommendations')
      return NextResponse.json(generateFallbackRecommendations(properties))
    }
    
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const prompt = `
      You are an Airbnb property optimization expert. Analyze these properties and provide specific, actionable recommendations for each one.
      
      Market Context:
      - Total Portfolio: ${marketContext.totalProperties} properties
      - Average Revenue: $${marketContext.avgRevenue}
      - Average Occupancy: ${marketContext.avgOccupancy} nights/month
      - Average Stay: ${marketContext.avgStay} nights
      
      Properties to Analyze:
      ${properties.map((p: any) => `
      Property: ${p.name}
      - Revenue: $${p.revenue}
      - Nights Booked: ${p.nightsBooked}
      - Average Stay: ${p.avgNightStay} nights
      - Health Score: ${p.healthScore}/100
      - Status: ${p.status}
      `).join('\n')}
      
      For each property, provide 1-2 specific, actionable recommendations based on its performance compared to the portfolio average.
      Focus on:
      - If low revenue: pricing strategy, listing optimization, or photos
      - If low occupancy: availability settings, minimum stay, or location marketing
      - If inactive: reactivation steps or repositioning
      - If high performer: what to maintain and how to scale
      
      Return as JSON array with format:
      [
        {
          "propertyName": "exact property name",
          "recommendations": ["specific recommendation 1", "specific recommendation 2"]
        }
      ]
      
      Be specific - mention actual numbers, percentages, and concrete actions.
      Keep each recommendation under 100 characters.
      `
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Parse JSON from response
      try {
        const cleanedText = text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        const recommendations = JSON.parse(cleanedText)
        console.log('Generated Gemini recommendations for', recommendations.length, 'properties')
        return NextResponse.json(recommendations)
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError)
        return NextResponse.json(generateFallbackRecommendations(properties))
      }
      
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError)
      return NextResponse.json(generateFallbackRecommendations(properties))
    }
    
  } catch (error) {
    console.error('Property recommendations API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

function generateFallbackRecommendations(properties: any[]) {
  return properties.map(p => ({
    propertyName: p.name,
    recommendations: [
      p.revenue < 500 ? 'Consider reducing minimum stay requirements' : 
      p.revenue < 2000 ? 'Review pricing against local competition' :
      p.revenue < 3000 ? 'Add professional photos to increase bookings' :
      'Maintain current strategy, performing well',
      
      p.nightsBooked < 10 ? 'Enable instant booking for qualified guests' :
      p.nightsBooked < 20 ? 'Optimize listing title for local searches' :
      'Good occupancy - consider raising prices 5-10%'
    ].slice(0, 2)
  }))
}