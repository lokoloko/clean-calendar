export interface PropertyHealth {
  score: number // 0-100
  status: 'healthy' | 'warning' | 'critical'
  factors: {
    hasRevenue: number
    revenueLevel: number
    occupancy: number
    consistency: number
    trend: number
  }
  recommendations: string[]
}

export function calculateHealthScore(property: {
  name: string
  revenue: number
  nightsBooked: number
  avgNightStay: number
  monthsInactive?: number
}): PropertyHealth {
  const factors = {
    hasRevenue: 0,
    revenueLevel: 0,
    occupancy: 0,
    consistency: 0,
    trend: 0
  }
  
  const recommendations: string[] = []
  
  // Factor 1: Has Revenue (40 points)
  if (property.revenue > 0) {
    factors.hasRevenue = 40
  } else {
    recommendations.push('Property is generating no revenue - check listing status')
  }
  
  // Factor 2: Revenue Level (20 points)
  if (property.revenue > 3000) {
    factors.revenueLevel = 20
  } else if (property.revenue > 2000) {
    factors.revenueLevel = 15
  } else if (property.revenue > 1000) {
    factors.revenueLevel = 10
  } else if (property.revenue > 500) {
    factors.revenueLevel = 5
  } else if (property.revenue > 0) {
    factors.revenueLevel = 2
    recommendations.push('Revenue is below $500 - consider pricing optimization')
  }
  
  // Factor 3: Occupancy (20 points)
  const occupancyRate = property.nightsBooked / 30 // Assuming 30-day month
  if (occupancyRate > 0.8) {
    factors.occupancy = 20
  } else if (occupancyRate > 0.6) {
    factors.occupancy = 15
  } else if (occupancyRate > 0.4) {
    factors.occupancy = 10
    recommendations.push('Occupancy below 40% - review pricing and availability')
  } else if (occupancyRate > 0.2) {
    factors.occupancy = 5
    recommendations.push('Low occupancy rate - check competitive pricing')
  } else if (property.nightsBooked > 0) {
    factors.occupancy = 2
    recommendations.push('Very low occupancy - urgent review needed')
  }
  
  // Factor 4: Consistency (10 points)
  if (property.revenue > 0 && (!property.monthsInactive || property.monthsInactive === 0)) {
    factors.consistency = 10
  } else if (property.monthsInactive && property.monthsInactive < 2) {
    factors.consistency = 5
    recommendations.push('Property has been inactive recently')
  } else if (property.monthsInactive && property.monthsInactive >= 2) {
    factors.consistency = 0
    recommendations.push(`Property inactive for ${property.monthsInactive} months`)
  }
  
  // Factor 5: Trend (10 points) - placeholder for now
  factors.trend = property.revenue > 0 ? 5 : 0
  
  // Calculate total score
  const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0)
  
  // Determine status
  let status: 'healthy' | 'warning' | 'critical'
  if (totalScore >= 70) {
    status = 'healthy'
  } else if (totalScore >= 40) {
    status = 'warning'
  } else {
    status = 'critical'
  }
  
  // Add status-specific recommendations
  if (status === 'critical' && property.revenue === 0) {
    recommendations.unshift('URGENT: Property is not generating any revenue')
  }
  
  return {
    score: totalScore,
    status,
    factors,
    recommendations
  }
}

export function getHealthColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

export function getHealthBgColor(score: number): string {
  if (score >= 70) return 'bg-green-50'
  if (score >= 40) return 'bg-yellow-50'
  return 'bg-red-50'
}

export function getHealthBorderColor(score: number): string {
  if (score >= 70) return 'border-green-200'
  if (score >= 40) return 'border-yellow-200'
  return 'border-red-200'
}