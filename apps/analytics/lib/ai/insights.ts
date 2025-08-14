import { generateAIInsights } from './gemini-client'

export interface AIInsight {
  type: 'opportunity' | 'warning' | 'success' | 'info' | 'critical' | 'trend'
  title: string
  description: string
  impact?: string
  priority?: 'high' | 'medium' | 'low'
}

export async function generateInsights(data: {
  totalRevenue: number
  activeProperties: number
  inactiveProperties: number
  totalNights?: number
  properties: Array<{
    name: string
    revenue: number
    nightsBooked: number
    status: string
    healthScore?: number
  }>
}): Promise<AIInsight[]> {
  // Try to get real AI insights from Gemini
  try {
    const aiResponse = await generateAIInsights(data)
    
    if (aiResponse && (aiResponse.criticalIssues || aiResponse.opportunities)) {
      const insights: AIInsight[] = []
      
      // Add critical issues with high priority
      if (aiResponse.criticalIssues) {
        aiResponse.criticalIssues.forEach((issue: any) => {
          insights.push({
            type: 'critical' as const,
            title: issue.title,
            description: issue.description,
            impact: issue.impact,
            priority: 'high'
          })
        })
      }
      
      // Add opportunities
      if (aiResponse.opportunities) {
        aiResponse.opportunities.forEach((opp: any) => {
          insights.push({
            type: 'opportunity',
            title: opp.title,
            description: opp.description,
            impact: opp.impact,
            priority: 'medium'
          })
        })
      }
      
      // Add patterns as trends
      if (aiResponse.patterns) {
        aiResponse.patterns.forEach((pattern: any) => {
          insights.push({
            type: 'trend' as const,
            title: pattern.title,
            description: pattern.description,
            impact: pattern.trend,
            priority: 'low'
          })
        })
      }
      
      // Add strategic advice as info
      if (aiResponse.strategicAdvice) {
        aiResponse.strategicAdvice.forEach((advice: any, index: number) => {
          if (index < 2) { // Add top 2 strategic advice
            insights.push({
              type: 'info' as const,
              title: advice.category,
              description: advice.advice,
              impact: advice.benefit,
              priority: 'medium'
            })
          }
        })
      }
      
      // Add top risks as warnings
      if (aiResponse.risks) {
        aiResponse.risks.forEach((risk: any, index: number) => {
          if (index < 2) { // Add top 2 risks
            insights.push({
              type: 'warning' as const,
              title: risk.type,
              description: risk.description,
              impact: risk.mitigation,
              priority: 'high'
            })
          }
        })
      }
      
      // Sort by priority and return more insights
      insights.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return (priorityOrder[a.priority || 'medium'] || 1) - (priorityOrder[b.priority || 'medium'] || 1)
      })
      
      // Return top insights if we got real AI results (increased to 8)
      if (insights.length > 0) {
        return insights.slice(0, 8)
      }
    }
  } catch (error) {
    console.log('Gemini API not configured or error occurred, using fallback insights')
  }
  
  // Fallback to mock insights if Gemini is not configured or fails
  const insights: AIInsight[] = []
  
  // Analyze inactive properties
  if (data.inactiveProperties > 0) {
    const inactiveNames = data.properties
      .filter(p => p.status === 'inactive')
      .map(p => p.name)
      .slice(0, 3)
      .join(', ')
    
    insights.push({
      type: 'warning',
      title: `${data.inactiveProperties} Properties Generating No Revenue`,
      description: `Properties like ${inactiveNames} are inactive. These properties likely have issues with listing visibility, pricing, or availability settings.`,
      impact: `Potential monthly revenue loss: $${(data.inactiveProperties * 2000).toLocaleString()}`,
      priority: 'high'
    })
  }
  
  // Analyze top performers
  const topPerformers = data.properties
    .filter(p => p.revenue > 3000)
    .sort((a, b) => b.revenue - a.revenue)
  
  if (topPerformers.length > 0) {
    insights.push({
      type: 'success',
      title: 'Top Performing Properties',
      description: `${topPerformers[0].name} is your best performer at $${topPerformers[0].revenue.toLocaleString()}. Apply its strategies to underperforming properties.`,
      impact: 'Model for other properties',
      priority: 'medium'
    })
  }
  
  // Seasonal opportunity
  const winterProperties = ['Azusa E - Sunrise Getaway', 'Azusa F - Getaway', 'Azusa G - Dream Getaway']
  const inactiveWinter = data.properties.filter(p => 
    winterProperties.includes(p.name) && p.status === 'inactive'
  )
  
  if (inactiveWinter.length > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Seasonal Optimization Opportunity',
      description: 'Your Azusa properties are all inactive. These may be seasonally affected. Consider adjusting pricing or targeting different guest segments.',
      impact: 'Could recover $5,000-8,000/month',
      priority: 'high'
    })
  }
  
  // Occupancy insights
  const avgOccupancy = data.properties.reduce((sum, p) => sum + p.nightsBooked, 0) / data.properties.length
  if (avgOccupancy < 15) {
    insights.push({
      type: 'warning',
      title: 'Low Portfolio Occupancy',
      description: `Average occupancy is only ${avgOccupancy.toFixed(1)} nights per property. Consider reviewing pricing strategy and minimum stay requirements.`,
      impact: 'Increasing occupancy by 20% could add $4,000/month',
      priority: 'high'
    })
  }
  
  // Location clustering
  const monroviaProperties = data.properties.filter(p => p.name.includes('Monrovia'))
  const monroviaInactive = monroviaProperties.filter(p => p.status === 'inactive')
  
  if (monroviaInactive.length > 0) {
    insights.push({
      type: 'info',
      title: 'Location Pattern Detected',
      description: `${monroviaInactive.length} of your Monrovia properties are inactive. This could indicate a local market issue or seasonal trend.`,
      priority: 'medium'
    })
  }
  
  // Revenue concentration risk
  const topRevenue = Math.max(...data.properties.map(p => p.revenue))
  const revenueConcentration = topRevenue / data.totalRevenue
  
  if (revenueConcentration > 0.15) {
    insights.push({
      type: 'info',
      title: 'Revenue Concentration Risk',
      description: `${(revenueConcentration * 100).toFixed(1)}% of revenue comes from a single property. Diversifying performance across properties would reduce risk.`,
      priority: 'low'
    })
  }
  
  return insights
}

export function getInsightIcon(type: AIInsight['type']): string {
  switch (type) {
    case 'opportunity': return '💡'
    case 'warning': return '⚠️'
    case 'success': return '✅'
    case 'info': return 'ℹ️'
    case 'critical': return '🚨'
    case 'trend': return '📈'
    default: return '📊'
  }
}

export function getInsightColor(type: AIInsight['type']): string {
  switch (type) {
    case 'opportunity': return 'bg-blue-50 border-blue-200 text-blue-900'
    case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-900'
    case 'success': return 'bg-green-50 border-green-200 text-green-900'
    case 'info': return 'bg-gray-50 border-gray-200 text-gray-900'
    case 'critical': return 'bg-red-50 border-red-200 text-red-900'
    case 'trend': return 'bg-purple-50 border-purple-200 text-purple-900'
    default: return 'bg-gray-50 border-gray-200 text-gray-900'
  }
}