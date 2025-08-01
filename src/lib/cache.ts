/**
 * Caching implementation for frequently accessed data
 * Uses Next.js unstable_cache for server-side caching
 */

import { unstable_cache } from 'next/cache'
import { db } from './db'
import { logger } from './logger-edge'
import type { Listing, Cleaner, ScheduleItem } from '@/types'

// Cache configuration
const CACHE_TIMES = {
  LISTINGS: 300,      // 5 minutes
  CLEANERS: 300,      // 5 minutes
  DASHBOARD: 60,      // 1 minute
  SCHEDULE: 180,      // 3 minutes
  USER_PROFILE: 600,  // 10 minutes
} as const

// Cache tags for invalidation
export const CACHE_TAGS = {
  LISTINGS: 'listings',
  CLEANERS: 'cleaners',
  DASHBOARD: 'dashboard',
  SCHEDULE: 'schedule',
  USER: 'user',
} as const

/**
 * Get cached listings for a user
 */
export const getCachedListings = unstable_cache(
  async (userId: string): Promise<Listing[]> => {
    logger.debug('Fetching listings from database', { userId })
    
    const result = await db.query(
      `SELECT * FROM listings 
       WHERE user_id = $1 AND deleted_at IS NULL 
       ORDER BY name`,
      [userId]
    )
    
    return result.rows
  },
  ['listings'],
  {
    revalidate: CACHE_TIMES.LISTINGS,
    tags: [CACHE_TAGS.LISTINGS]
  }
)

/**
 * Get cached cleaners for a user
 */
export const getCachedCleaners = unstable_cache(
  async (userId: string): Promise<Cleaner[]> => {
    logger.debug('Fetching cleaners from database', { userId })
    
    const result = await db.query(
      `SELECT * FROM cleaners 
       WHERE user_id = $1 AND deleted_at IS NULL 
       ORDER BY name`,
      [userId]
    )
    
    return result.rows
  },
  ['cleaners'],
  {
    revalidate: CACHE_TIMES.CLEANERS,
    tags: [CACHE_TAGS.CLEANERS]
  }
)

/**
 * Get cached dashboard metrics
 */
export const getCachedDashboardMetrics = unstable_cache(
  async (userId: string) => {
    logger.debug('Fetching dashboard metrics from database', { userId })
    
    const result = await db.query(`
      WITH metrics AS (
        SELECT 
          COUNT(DISTINCT listing_id) as total_listings,
          COUNT(*) FILTER (WHERE date = CURRENT_DATE) as cleanings_today,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '7 days') as cleanings_week,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '30 days') as cleanings_month
        FROM schedule_items
        WHERE user_id = $1 AND deleted_at IS NULL
      ),
      cleaner_count AS (
        SELECT COUNT(*) as total_cleaners
        FROM cleaners
        WHERE user_id = $1 AND deleted_at IS NULL
      ),
      feedback_stats AS (
        SELECT 
          COUNT(*) as total_feedback,
          AVG(cleanliness_rating) as avg_rating
        FROM feedback f
        JOIN schedule_items s ON f.schedule_item_id = s.id
        WHERE s.user_id = $1
      )
      SELECT 
        m.*,
        c.total_cleaners,
        f.total_feedback,
        f.avg_rating
      FROM metrics m, cleaner_count c, feedback_stats f
    `, [userId])
    
    return result.rows[0]
  },
  ['dashboard-metrics'],
  {
    revalidate: CACHE_TIMES.DASHBOARD,
    tags: [CACHE_TAGS.DASHBOARD]
  }
)

/**
 * Get cached schedule for date range
 */
export const getCachedSchedule = unstable_cache(
  async (userId: string, startDate: string, endDate: string): Promise<ScheduleItem[]> => {
    logger.debug('Fetching schedule from database', { userId, startDate, endDate })
    
    const result = await db.query(`
      SELECT 
        s.*,
        l.name as listing_name,
        l.address as listing_address,
        c.name as cleaner_name,
        c.phone as cleaner_phone,
        f.cleanliness_rating,
        f.notes as feedback_notes
      FROM schedule_items s
      LEFT JOIN listings l ON s.listing_id = l.id
      LEFT JOIN cleaners c ON s.cleaner_id = c.id
      LEFT JOIN feedback f ON f.schedule_item_id = s.id
      WHERE s.user_id = $1
        AND s.date >= $2
        AND s.date <= $3
        AND s.deleted_at IS NULL
      ORDER BY s.date, s.checkout_time
    `, [userId, startDate, endDate])
    
    return result.rows
  },
  ['schedule'],
  {
    revalidate: CACHE_TIMES.SCHEDULE,
    tags: [CACHE_TAGS.SCHEDULE]
  }
)

/**
 * Get cached user profile
 */
export const getCachedUserProfile = unstable_cache(
  async (userId: string) => {
    logger.debug('Fetching user profile from database', { userId })
    
    const result = await db.query(`
      SELECT 
        p.*,
        COUNT(DISTINCT l.id) as listing_count,
        COUNT(DISTINCT c.id) as cleaner_count
      FROM profiles p
      LEFT JOIN listings l ON l.user_id = p.user_id AND l.deleted_at IS NULL
      LEFT JOIN cleaners c ON c.user_id = p.user_id AND c.deleted_at IS NULL
      WHERE p.user_id = $1
      GROUP BY p.id
    `, [userId])
    
    return result.rows[0]
  },
  ['user-profile'],
  {
    revalidate: CACHE_TIMES.USER_PROFILE,
    tags: [CACHE_TAGS.USER]
  }
)

/**
 * Invalidate cache by tags
 * Use this when data is updated
 */
export async function invalidateCache(tags: string | string[]) {
  const tagArray = Array.isArray(tags) ? tags : [tags]
  logger.info('Invalidating cache', { tags: tagArray })
  
  // Next.js 14+ cache invalidation
  try {
    const { revalidateTag } = await import('next/cache')
    tagArray.forEach(tag => revalidateTag(tag))
  } catch (error) {
    logger.error('Failed to invalidate cache', error as Error)
  }
}

/**
 * Preload cache for a user
 * Call this after login to warm up the cache
 */
export async function preloadUserCache(userId: string) {
  logger.info('Preloading cache for user', { userId })
  
  try {
    // Fetch all cached data in parallel
    await Promise.all([
      getCachedListings(userId),
      getCachedCleaners(userId),
      getCachedDashboardMetrics(userId),
      getCachedUserProfile(userId),
    ])
    
    logger.info('Cache preload complete', { userId })
  } catch (error) {
    logger.error('Failed to preload cache', error as Error)
  }
}

/**
 * Clear all cache for a user
 * Use this on logout or data reset
 */
export async function clearUserCache(userId: string) {
  logger.info('Clearing cache for user', { userId })
  
  await invalidateCache([
    CACHE_TAGS.LISTINGS,
    CACHE_TAGS.CLEANERS,
    CACHE_TAGS.DASHBOARD,
    CACHE_TAGS.SCHEDULE,
    CACHE_TAGS.USER,
  ])
}

// In-memory cache for very frequent queries (like auth checks)
class MemoryCache<T> {
  private cache = new Map<string, { value: T; expires: number }>()
  
  set(key: string, value: T, ttlSeconds: number) {
    const expires = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { value, expires })
  }
  
  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return undefined
    }
    
    return item.value
  }
  
  delete(key: string) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
  }
}

// Export memory cache instance for auth and session data
export const memoryCache = new MemoryCache()

// Clean up expired entries periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, item] of memoryCache['cache']) {
      if (now > item.expires) {
        memoryCache.delete(key)
      }
    }
  }, 60000) // Every minute
}