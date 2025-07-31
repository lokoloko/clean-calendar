import { db } from './db';

// Tier limits configuration
export const TIER_LIMITS = {
  free: {
    listings: 1,
    cleaners: 2,
    sms: false,
    whatsapp: false,
    email: true,
    cleanerDashboard: false,
    autoAssignment: false,
    dailyAlerts: false,
    weeklyExport: false,
    analytics: false,
    feedbackReminders: false
  },
  starter: {
    listings: 3,
    cleaners: 5,
    sms: true,
    whatsapp: false,
    email: true,
    cleanerDashboard: false,
    autoAssignment: false,
    dailyAlerts: false,
    weeklyExport: true,
    analytics: false,
    feedbackReminders: true
  },
  pro: {
    listings: 999,
    cleaners: 999,
    sms: true,
    whatsapp: true,
    email: true,
    cleanerDashboard: true,
    autoAssignment: true,
    dailyAlerts: true,
    weeklyExport: true,
    analytics: true,
    feedbackReminders: true
  }
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;
export type SubscriptionFeature = keyof typeof TIER_LIMITS.free;

interface Profile {
  subscription_tier: SubscriptionTier;
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due';
  trial_ends_at: string | null;
}

/**
 * Get the effective tier for a user (considering trial status)
 */
export function getUserTier(profile: Profile): SubscriptionTier {
  // If user is in trial period, they get starter features
  if (profile.subscription_status === 'trial' && profile.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at);
    if (new Date() < trialEnd) {
      return 'starter';
    }
  }
  
  // After trial or for active subscriptions, return actual tier
  return profile.subscription_tier || 'free';
}

/**
 * Calculate days left in trial
 */
export function getDaysLeftInTrial(profile: Profile): number {
  if (profile.subscription_status !== 'trial' || !profile.trial_ends_at) {
    return 0;
  }
  
  const now = new Date();
  const trialEnd = new Date(profile.trial_ends_at);
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysLeft);
}

/**
 * Check if a user has access to a specific feature
 */
export async function checkFeature(userId: string, feature: SubscriptionFeature): Promise<boolean> {
  try {
    const profile = await db.getProfile(userId);
    if (!profile) return false;
    
    const tier = getUserTier(profile);
    return TIER_LIMITS[tier][feature] === true;
  } catch (error) {
    console.error('Error checking feature:', error);
    return false;
  }
}

/**
 * Get a numeric limit for a feature (e.g., max listings)
 */
export async function getFeatureLimit(userId: string, feature: 'listings' | 'cleaners'): Promise<number> {
  try {
    const profile = await db.getProfile(userId);
    if (!profile) return 0;
    
    const tier = getUserTier(profile);
    return TIER_LIMITS[tier][feature];
  } catch (error) {
    console.error('Error getting feature limit:', error);
    return 0;
  }
}

/**
 * Check if user can create more listings
 */
export async function canCreateListing(userId: string): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  try {
    const [profile, listings] = await Promise.all([
      db.getProfile(userId),
      db.getListings(userId)
    ]);
    
    if (!profile) {
      return { allowed: false, reason: 'Profile not found' };
    }
    
    const tier = getUserTier(profile);
    const limit = TIER_LIMITS[tier].listings;
    const current = listings.length;
    
    if (current >= limit) {
      return { 
        allowed: false, 
        reason: `You've reached the ${limit} listing limit for ${tier} plan`,
        limit,
        current
      };
    }
    
    return { allowed: true, limit, current };
  } catch (error) {
    console.error('Error checking listing limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Check if user can create more cleaners
 */
export async function canCreateCleaner(userId: string): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  try {
    const [profile, cleaners] = await Promise.all([
      db.getProfile(userId),
      db.getCleaners(userId)
    ]);
    
    if (!profile) {
      return { allowed: false, reason: 'Profile not found' };
    }
    
    const tier = getUserTier(profile);
    const limit = TIER_LIMITS[tier].cleaners;
    const current = cleaners.length;
    
    if (current >= limit) {
      return { 
        allowed: false, 
        reason: `You've reached the ${limit} cleaner limit for ${tier} plan`,
        limit,
        current
      };
    }
    
    return { allowed: true, limit, current };
  } catch (error) {
    console.error('Error checking cleaner limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Get user's subscription info with feature access
 */
export async function getSubscriptionInfo(userId: string) {
  try {
    const profile = await db.getProfile(userId);
    if (!profile) return null;
    
    const tier = getUserTier(profile);
    const daysLeftInTrial = getDaysLeftInTrial(profile);
    const features = TIER_LIMITS[tier];
    
    // Get current usage
    const [listings, cleaners] = await Promise.all([
      db.getListings(userId),
      db.getCleaners(userId)
    ]);
    
    return {
      tier,
      status: profile.subscription_status,
      daysLeftInTrial,
      features,
      usage: {
        listings: {
          current: listings.length,
          limit: features.listings
        },
        cleaners: {
          current: cleaners.length,
          limit: features.cleaners
        }
      },
      trialEndsAt: profile.trial_ends_at
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return null;
  }
}

/**
 * Format tier name for display
 */
export function formatTierName(tier: SubscriptionTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Get upgrade URL for a specific feature
 */
export function getUpgradeUrl(feature?: SubscriptionFeature): string {
  const base = '/billing/upgrade';
  if (feature) {
    return `${base}?feature=${feature}`;
  }
  return base;
}