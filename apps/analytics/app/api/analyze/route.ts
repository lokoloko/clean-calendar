import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { properties, totalRevenue, activeCount, inactiveCount } = data
    
    // Calculate metrics
    const avgRevenue = properties.length > 0 ? totalRevenue / properties.length : 0
    const occupancyRate = (activeCount / Math.max(properties.length, 1)) * 100
    const performanceScore = Math.min(100, (totalRevenue / 20000) * 100)
    
    // Try to use Gemini if API key is available
    const geminiKey = process.env.GEMINI_API_KEY
    
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
        
        const prompt = `
        Analyze this Airbnb portfolio data and provide high-level insights:
        
        Total Properties: ${properties.length}
        Active Properties: ${activeCount}
        Inactive Properties: ${inactiveCount}
        Total Monthly Revenue: $${totalRevenue.toFixed(2)}
        Average Revenue per Property: $${avgRevenue.toFixed(2)}
        
        Property Details:
        ${properties.map((p: any) => `- ${p.pdfName}: $${p.revenue} (${p.status})`).join('\n')}
        
        Provide a JSON response with:
        1. summary object with totalRevenue, averageRevenue, occupancyRate (percentage), performanceScore (0-100)
        2. insights array (3-4 items) with type (success/warning/opportunity) and message
        3. recommendations array (4 items) with actionable, high-level suggestions
        
        Focus on:
        - Overall portfolio performance
        - Inactive property opportunities
        - Revenue optimization potential
        - Market positioning
        
        Keep recommendations high-level and strategic, not detailed operational advice.
        Format as valid JSON only, no markdown or extra text.
        `
        
        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()
        
        // Try to parse the JSON response
        try {
          // Clean up the response - remove markdown code blocks if present
          const cleanedText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
          
          const analysis = JSON.parse(cleanedText)
          
          // Ensure the response has the expected structure
          if (analysis.summary && analysis.insights && analysis.recommendations) {
            return NextResponse.json(analysis)
          }
        } catch (parseError) {
          console.error('Failed to parse Gemini response:', parseError)
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError)
      }
    }
    
    // Fallback analysis if Gemini is not available or fails
    const insights = []
    const recommendations = []
    
    // Generate insights based on data
    if (occupancyRate < 60) {
      insights.push({
        type: 'warning',
        message: `Low portfolio occupancy at ${occupancyRate.toFixed(0)}% - significant room for improvement`
      })
      recommendations.push('Activate inactive properties or consider removing from portfolio')
    }
    
    if (avgRevenue > 2500) {
      insights.push({
        type: 'success',
        message: `Strong average revenue of $${avgRevenue.toFixed(0)} per property exceeds market average`
      })
    } else {
      insights.push({
        type: 'opportunity',
        message: 'Revenue per property below optimal - pricing strategy review recommended'
      })
      recommendations.push('Review and optimize pricing strategy across all properties')
    }
    
    if (activeCount > 5) {
      insights.push({
        type: 'opportunity',
        message: 'Portfolio size supports advanced revenue management strategies'
      })
      recommendations.push('Implement dynamic pricing tools for revenue optimization')
    }
    
    // Add more recommendations
    recommendations.push(
      'Focus on improving occupancy for underperforming properties',
      'Consider seasonal pricing adjustments based on demand patterns'
    )
    
    return NextResponse.json({
      summary: {
        totalRevenue,
        averageRevenue: avgRevenue,
        occupancyRate,
        performanceScore
      },
      insights,
      recommendations: recommendations.slice(0, 4) // Limit to 4 recommendations
    })
    
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze properties' },
      { status: 500 }
    )
  }
}