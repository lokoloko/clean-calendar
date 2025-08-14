// Client-side API wrapper for Gemini insights
// All actual Gemini API calls happen server-side for security

export const generateAIInsights = async (data: any) => {
  try {
    // Call server-side API endpoint
    const response = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      console.error('Failed to get AI insights:', response.statusText)
      return generateMockInsights(data)
    }
    
    const insights = await response.json()
    console.log('Received AI insights from API')
    return insights
    
  } catch (error) {
    console.error('Error calling insights API:', error)
    return generateMockInsights(data)
  }
}

function generateMockInsights(data: any) {
  // Existing mock logic as fallback
  const insights = []
  
  if (data.inactiveProperties > 0) {
    insights.push({
      type: 'critical',
      title: `${data.inactiveProperties} Inactive Properties`,
      description: `${data.inactiveProperties} properties generated no revenue this month`,
      impact: `Potential monthly loss: $${(data.totalRevenue / data.activeProperties * data.inactiveProperties).toFixed(0)}`
    })
  }
  
  const avgRevenue = data.totalRevenue / data.activeProperties
  insights.push({
    type: 'opportunity',
    title: 'Revenue Optimization',
    description: `Average property revenue is $${avgRevenue.toFixed(0)}`,
    impact: 'Properties below average could increase by 20-30% with optimization'
  })
  
  return {
    criticalIssues: insights.filter(i => i.type === 'critical'),
    opportunities: insights.filter(i => i.type === 'opportunity'),
    patterns: [],
    recommendations: []
  }
}