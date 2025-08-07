export type UserTier = 'free' | 'pro' | 'enterprise'

export interface UserProfile {
  id?: string
  email?: string
  tier: UserTier
  trialEndsAt?: Date
  subscribedAt?: Date
  monthlyQuota?: {
    pdfUploads: number
    csvUploads: number
    exports: number
  }
}

export const TIER_FEATURES = {
  free: {
    pdfUploads: 3, // per month
    csvUploads: 0,
    exports: 0,
    historicalAnalytics: false,
    propertyComparison: false,
    advancedInsights: false,
    savedReports: false,
    automatedMonitoring: false,
    maxProperties: 10,
    dataRetention: 30, // days
  },
  pro: {
    pdfUploads: -1, // unlimited
    csvUploads: -1,
    exports: -1,
    historicalAnalytics: true,
    propertyComparison: true,
    advancedInsights: true,
    savedReports: true,
    automatedMonitoring: false, // coming soon
    maxProperties: -1, // unlimited
    dataRetention: 365, // days
  },
  enterprise: {
    pdfUploads: -1,
    csvUploads: -1,
    exports: -1,
    historicalAnalytics: true,
    propertyComparison: true,
    advancedInsights: true,
    savedReports: true,
    automatedMonitoring: true,
    maxProperties: -1,
    dataRetention: -1, // unlimited
    apiAccess: true,
    whiteLabel: true,
    prioritySupport: true,
  }
}

export function getUserTier(): UserProfile {
  // Check session storage for user profile
  const stored = sessionStorage.getItem('userProfile')
  if (stored) {
    return JSON.parse(stored)
  }
  
  // Default to free tier
  return {
    tier: 'free',
    monthlyQuota: {
      pdfUploads: 3,
      csvUploads: 0,
      exports: 0
    }
  }
}

export function setUserTier(profile: UserProfile) {
  sessionStorage.setItem('userProfile', JSON.stringify(profile))
}

export function canAccessFeature(feature: keyof typeof TIER_FEATURES.free): boolean {
  const user = getUserTier()
  const tierFeatures = TIER_FEATURES[user.tier]
  
  const value = tierFeatures[feature as keyof typeof tierFeatures]
  
  // For boolean features
  if (typeof value === 'boolean') {
    return value
  }
  
  // For numeric quotas (-1 means unlimited)
  if (typeof value === 'number') {
    return value !== 0
  }
  
  return false
}

export function getRemainingQuota(feature: 'pdfUploads' | 'csvUploads' | 'exports'): number {
  const user = getUserTier()
  const tierFeatures = TIER_FEATURES[user.tier]
  const limit = tierFeatures[feature]
  
  if (limit === -1) return -1 // unlimited
  if (limit === 0) return 0 // not allowed
  
  // Get current usage from session
  const usage = JSON.parse(sessionStorage.getItem('monthlyUsage') || '{}')
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const monthlyUsage = usage[currentMonth] || {}
  const used = monthlyUsage[feature] || 0
  
  return Math.max(0, limit - used)
}

export function incrementUsage(feature: 'pdfUploads' | 'csvUploads' | 'exports') {
  const usage = JSON.parse(sessionStorage.getItem('monthlyUsage') || '{}')
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  if (!usage[currentMonth]) {
    usage[currentMonth] = {}
  }
  
  usage[currentMonth][feature] = (usage[currentMonth][feature] || 0) + 1
  sessionStorage.setItem('monthlyUsage', JSON.stringify(usage))
}

// Mock function to simulate user upgrade (for testing)
export function mockUpgradeToTier(tier: UserTier) {
  const profile: UserProfile = {
    tier,
    subscribedAt: new Date(),
    monthlyQuota: {
      pdfUploads: TIER_FEATURES[tier].pdfUploads,
      csvUploads: TIER_FEATURES[tier].csvUploads,
      exports: TIER_FEATURES[tier].exports
    }
  }
  setUserTier(profile)
  
  // Clear usage for fresh start
  sessionStorage.removeItem('monthlyUsage')
}