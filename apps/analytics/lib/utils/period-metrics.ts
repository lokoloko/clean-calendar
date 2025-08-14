import { Property, PropertyMetrics } from '../storage/property-store'
import { deduplicateTransactions, calculateOccupancy as calcOccupancy } from './transaction-dedup'

export type TimePeriod = 'last12months' | 'yearToDate' | 'allTime'

/**
 * Calculate metrics for a specific time period
 */
export function calculatePeriodMetrics(
  property: Property,
  period: TimePeriod
): PropertyMetrics {
  // Start with default metrics structure
  const metrics: PropertyMetrics = {
    revenue: {
      value: 0,
      source: 'calculated',
      confidence: 0,
      lastUpdated: new Date()
    },
    occupancy: {
      value: 0,
      source: 'calculated',
      confidence: 0,
      lastUpdated: new Date()
    },
    pricing: {
      value: 0,
      source: 'calculated',
      confidence: 0,
      lastUpdated: new Date()
    },
    satisfaction: {
      value: 0,
      source: 'calculated',
      confidence: 0,
      lastUpdated: new Date()
    },
    health: 0
  }

  // Get CSV transactions if available
  const transactions = property.dataSources?.csv?.data || []
  
  if (transactions.length === 0) {
    // Return all-time metrics if no transaction data
    return property.metrics
  }

  // Calculate date range based on period
  const now = new Date()
  let startDate: Date
  let endDate = now

  switch (period) {
    case 'last12months':
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 12)
      break
    case 'yearToDate':
      startDate = new Date(now.getFullYear(), 0, 1) // January 1st of current year
      break
    case 'allTime':
      // Use all available data
      return property.metrics // Return pre-calculated all-time metrics
    default:
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 12)
  }

  // Filter transactions by date range
  const filteredTransactions = transactions.filter((t: any) => {
    if (!t.startDate) return false
    const transactionDate = new Date(t.startDate)
    return transactionDate >= startDate && transactionDate <= endDate
  })

  // Deduplicate transactions by confirmation code
  const { uniqueBookings, stats } = deduplicateTransactions(filteredTransactions)
  
  // Use deduplicated values
  const totalRevenue = stats.totalRevenue
  const totalNights = stats.uniqueNights
  const correctedNights = totalNights // Already deduplicated

  // Calculate days in period
  const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Calculate occupancy
  const occupancyRate = (correctedNights / daysInPeriod) * 100

  // Calculate average nightly rate
  const avgRate = correctedNights > 0 ? totalRevenue / correctedNights : 0

  // Update metrics
  metrics.revenue = {
    value: totalRevenue,
    source: 'csv',
    confidence: 90,
    lastUpdated: new Date()
  }

  metrics.occupancy = {
    value: Math.min(100, Math.max(0, occupancyRate)),
    source: 'csv',
    confidence: 85,
    lastUpdated: new Date()
  }

  metrics.pricing = {
    value: avgRate,
    source: 'csv',
    confidence: 90,
    lastUpdated: new Date()
  }

  // Keep satisfaction from original if available
  if (property.metrics?.satisfaction) {
    metrics.satisfaction = property.metrics.satisfaction
  }

  // Calculate health score
  metrics.health = calculateHealthScore(metrics)

  return metrics
}

/**
 * Calculate health score based on metrics
 */
function calculateHealthScore(metrics: PropertyMetrics): number {
  let score = 0
  let count = 0

  // Revenue contributes to health
  if (metrics.revenue.value > 0) {
    score += Math.min(100, (metrics.revenue.value / 50000) * 100) // Scale up to 50k = 100%
    count++
  }

  // Occupancy contributes to health
  if (metrics.occupancy.value > 0) {
    score += metrics.occupancy.value
    count++
  }

  // Pricing contributes to health (higher rate = better)
  if (metrics.pricing.value > 0) {
    score += Math.min(100, (metrics.pricing.value / 200) * 100) // $200/night = 100%
    count++
  }

  // Satisfaction contributes if available
  if (metrics.satisfaction.value > 0) {
    score += metrics.satisfaction.value
    count++
  }

  return count > 0 ? Math.round(score / count) : 0
}

/**
 * Get period label for display
 */
export function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case 'last12months':
      return 'Last 12 Months'
    case 'yearToDate':
      return 'Year to Date'
    case 'allTime':
      return 'All Time'
    default:
      return 'Last 12 Months'
  }
}

/**
 * Get period description
 */
export function getPeriodDescription(period: TimePeriod): string {
  const now = new Date()
  
  switch (period) {
    case 'last12months':
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      return `${twelveMonthsAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`
    case 'yearToDate':
      return `Jan 1, ${now.getFullYear()} - ${now.toLocaleDateString()}`
    case 'allTime':
      return 'All available data'
    default:
      return ''
  }
}