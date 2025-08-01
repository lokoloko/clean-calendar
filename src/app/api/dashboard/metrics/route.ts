import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger-edge'
import { handleApiError, ApiResponses } from '@/lib/api-errors'

// Simple in-memory cache for production
const metricsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60 * 1000 // 1 minute in milliseconds

async function fetchMetrics(userId: string) {
  try {
    const result = await db.transaction(async (client) => {
      // Fetch all metrics in a single transaction
      const [
        profileResult,
        listingsResult,
        cleanersResult,
        scheduleResult,
        feedbackStatsResult,
        recentFeedbackResult,
        upcomingCleaningsResult,
      ] = await Promise.all([
        // Profile
        client.query('SELECT * FROM public.profiles WHERE id = $1', [userId]),
        
        // Listings with sync status
        client.query(`
          SELECT l.*, 
                 ls.last_synced_at,
                 ls.last_sync_status,
                 ls.last_sync_error,
                 COUNT(DISTINCT s.id) as total_cleanings
          FROM public.listings l
          LEFT JOIN public.listing_sync_status ls ON l.id = ls.listing_id
          LEFT JOIN public.schedule_items s ON l.id = s.listing_id
          WHERE l.user_id = $1
          GROUP BY l.id, ls.last_synced_at, ls.last_sync_status, ls.last_sync_error
          ORDER BY l.created_at DESC
        `, [userId]),
        
        // Cleaners with assignment count
        client.query(`
          SELECT c.*,
                 COUNT(DISTINCT a.listing_id) as assignment_count,
                 COUNT(DISTINCT s.id) as total_cleanings
          FROM public.cleaners c
          LEFT JOIN public.assignments a ON c.id = a.cleaner_id
          LEFT JOIN public.schedule_items s ON c.id = s.cleaner_id
          WHERE c.user_id = $1
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `, [userId]),
        
        // Schedule items with feedback
        client.query(`
          SELECT s.*, 
                 l.name as listing_name, 
                 l.timezone as listing_timezone, 
                 c.name as cleaner_name, 
                 c.phone as cleaner_phone,
                 COALESCE(s.source, 'airbnb') as source,
                 cf.id as feedback_id,
                 cf.cleanliness_rating,
                 cf.notes as feedback_notes,
                 cf.completed_at as feedback_completed_at
          FROM public.schedule_items s
          JOIN public.listings l ON s.listing_id = l.id
          JOIN public.cleaners c ON s.cleaner_id = c.id
          LEFT JOIN public.cleaner_feedback cf ON s.id = cf.schedule_item_id
          WHERE l.user_id = $1 
            AND s.check_out >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY s.check_out ASC
        `, [userId]),
        
        // Feedback statistics
        client.query(`
          SELECT 
            COUNT(*) as total_feedback,
            COUNT(CASE WHEN cf.cleanliness_rating = 'clean' THEN 1 END) as clean_count,
            COUNT(CASE WHEN cf.cleanliness_rating = 'normal' THEN 1 END) as normal_count,
            COUNT(CASE WHEN cf.cleanliness_rating = 'dirty' THEN 1 END) as dirty_count,
            ROUND(AVG(CASE 
              WHEN cf.cleanliness_rating = 'clean' THEN 3
              WHEN cf.cleanliness_rating = 'normal' THEN 2
              WHEN cf.cleanliness_rating = 'dirty' THEN 1
            END), 2) as average_rating
          FROM public.cleaner_feedback cf
          JOIN public.listings l ON cf.listing_id = l.id
          WHERE l.user_id = $1
            AND cf.created_at >= CURRENT_DATE - INTERVAL '30 days'
        `, [userId]),
        
        // Recent feedback for activity feed
        client.query(`
          SELECT cf.*,
                 c.name as cleaner_name,
                 l.name as listing_name,
                 s.check_out as cleaning_date
          FROM public.cleaner_feedback cf
          JOIN public.cleaners c ON cf.cleaner_id = c.id
          JOIN public.listings l ON cf.listing_id = l.id
          JOIN public.schedule_items s ON cf.schedule_item_id = s.id
          WHERE l.user_id = $1
          ORDER BY cf.created_at DESC
          LIMIT 5
        `, [userId]),
        
        // Upcoming cleanings
        client.query(`
          SELECT s.*, 
                 l.name as listing_name, 
                 c.name as cleaner_name
          FROM public.schedule_items s
          JOIN public.listings l ON s.listing_id = l.id
          JOIN public.cleaners c ON s.cleaner_id = c.id
          WHERE l.user_id = $1 
            AND s.check_out >= CURRENT_DATE
            AND s.check_out <= CURRENT_DATE + INTERVAL '7 days'
          ORDER BY s.check_out ASC
          LIMIT 10
        `, [userId]),
      ])

      // Calculate additional metrics
      const activeListings = listingsResult.rows.filter(l => l.is_active_on_airbnb).length
      const totalCleanings = scheduleResult.rows.length
      const completedCleanings = scheduleResult.rows.filter(s => s.is_completed || s.feedback_id).length
      const todaysCleanings = scheduleResult.rows.filter(s => {
        const checkOut = new Date(s.check_out)
        const today = new Date()
        return checkOut.toDateString() === today.toDateString()
      }).length

      return {
        profile: profileResult.rows[0],
        listings: listingsResult.rows,
        cleaners: cleanersResult.rows,
        schedule: scheduleResult.rows,
        metrics: {
          totalListings: listingsResult.rows.length,
          activeListings,
          totalCleaners: cleanersResult.rows.length,
          activeCleaners: cleanersResult.rows.filter(c => c.assignment_count > 0).length,
          totalCleanings,
          completedCleanings,
          todaysCleanings,
          completionRate: totalCleanings > 0 ? Math.round((completedCleanings / totalCleanings) * 100) : 0,
        },
        feedbackStats: feedbackStatsResult.rows[0] || {
          total_feedback: 0,
          clean_count: 0,
          normal_count: 0,
          dirty_count: 0,
          average_rating: null
        },
        recentFeedback: recentFeedbackResult.rows,
        upcomingCleanings: upcomingCleaningsResult.rows,
      }
    })

    return result
  } catch (error) {
    logger.error('Failed to fetch dashboard metrics', error)
    throw error
  }
}

export async function GET() {
  console.log('[Dashboard Metrics API] Checking authentication')
  const user = await getCurrentUser()
  
  if (!user) {
    console.log('[Dashboard Metrics API] No user found - returning 401')
    return NextResponse.json(
      { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }
  
  console.log('[Dashboard Metrics API] User authenticated:', user.id)
  
  try {

    // Check cache first
    const cached = metricsCache.get(user.id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.debug('Returning cached metrics', { userId: user.id })
      return NextResponse.json(cached.data)
    }

    // Fetch fresh data
    const metrics = await fetchMetrics(user.id)

    // Update cache
    metricsCache.set(user.id, {
      data: metrics,
      timestamp: Date.now()
    })

    // Clean up old cache entries periodically
    if (metricsCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of metricsCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          metricsCache.delete(key)
        }
      }
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return handleApiError(error, { 
      route: '/api/dashboard/metrics', 
      method: 'GET' 
    })
  }
}