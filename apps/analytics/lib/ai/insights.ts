export interface AIInsight {
  type: 'opportunity' | 'warning' | 'success' | 'info'
  title: string
  description: string
  impact?: string
  priority: 'high' | 'medium' | 'low'
}

export async function generateInsights(data: {
  totalRevenue: number
  activeProperties: number
  inactiveProperties: number
  properties: Array<{
    name: string
    revenue: number
    nightsBooked: number
    status: string
  }>
}): Promise<AIInsight[]> {
  // Mock AI insights for now - would integrate with Gemini API
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
    default: return '📊'
  }
}

export function getInsightColor(type: AIInsight['type']): string {
  switch (type) {
    case 'opportunity': return 'bg-blue-50 border-blue-200 text-blue-900'
    case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-900'
    case 'success': return 'bg-green-50 border-green-200 text-green-900'
    case 'info': return 'bg-gray-50 border-gray-200 text-gray-900'
    default: return 'bg-gray-50 border-gray-200 text-gray-900'
  }
}