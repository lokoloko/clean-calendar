import { createClient } from './supabase-server';
import { TIER_LIMITS, type SubscriptionTier, type SubscriptionFeature } from './subscription';

interface Profile {
  id: string;
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
 * Get user's subscription info with feature access (Supabase version)
 */
export async function getSubscriptionInfo(userId: string) {
  try {
    const supabase = await createClient();
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }
    
    const tier = getUserTier(profile);
    const daysLeftInTrial = getDaysLeftInTrial(profile);
    const features = TIER_LIMITS[tier];
    
    // Get current usage
    const [listingsResult, cleanersResult] = await Promise.all([
      supabase.from('listings').select('*').eq('user_id', userId),
      supabase.from('cleaners').select('*').eq('user_id', userId)
    ]);
    
    const listings = listingsResult.data || [];
    const cleaners = cleanersResult.data || [];
    
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
 * Check if user can create more listings (Supabase version)
 */
export async function canCreateListing(userId: string): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  try {
    const supabase = await createClient();
    
    const [profileResult, listingsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('listings').select('*').eq('user_id', userId)
    ]);
    
    if (profileResult.error || !profileResult.data) {
      return { allowed: false, reason: 'Profile not found' };
    }
    
    const profile = profileResult.data;
    const listings = listingsResult.data || [];
    
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
 * Check if user can create more cleaners (Supabase version)
 */
export async function canCreateCleaner(userId: string): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  try {
    const supabase = await createClient();
    
    const [profileResult, cleanersResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('cleaners').select('*').eq('user_id', userId)
    ]);
    
    if (profileResult.error || !profileResult.data) {
      return { allowed: false, reason: 'Profile not found' };
    }
    
    const profile = profileResult.data;
    const cleaners = cleanersResult.data || [];
    
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
 * Check if a user has access to a specific feature (Supabase version)
 */
export async function checkFeature(userId: string, feature: SubscriptionFeature): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !profile) return false;
    
    const tier = getUserTier(profile);
    return TIER_LIMITS[tier][feature] === true;
  } catch (error) {
    console.error('Error checking feature:', error);
    return false;
  }
}

/**
 * Get a numeric limit for a feature (e.g., max listings) (Supabase version)
 */
export async function getFeatureLimit(userId: string, feature: 'listings' | 'cleaners'): Promise<number> {
  try {
    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !profile) return 0;
    
    const tier = getUserTier(profile);
    return TIER_LIMITS[tier][feature];
  } catch (error) {
    console.error('Error getting feature limit:', error);
    return 0;
  }
}