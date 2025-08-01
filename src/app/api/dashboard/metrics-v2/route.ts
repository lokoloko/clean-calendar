import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger-edge'

// Simple in-memory cache for production
const metricsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60 * 1000 // 1 minute in milliseconds

async function fetchMetrics(userId: string) {
  try {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    // Fetch all data in parallel using Supabase
    const [
      profileResult,
      listingsResult,
      cleanersResult,
      scheduleResult,
      recentFeedbackResult,
      upcomingCleaningsResult,
      syncStatusResult,
      assignmentsResult
    ] = await Promise.all([
      // Profile
      supabase.from('profiles').select('*').eq('id', userId).single(),
      
      // Listings
      supabase.from('listings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      
      // Cleaners
      supabase.from('cleaners').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      
      // Schedule items with feedback (last 30 days)
      supabase.from('schedule_items').select(`
        *,
        listings!inner(name, timezone, user_id),
        cleaners!inner(name, phone),
        cleaner_feedback(
          id,
          cleanliness_rating,
          notes,
          completed_at
        )
      `).eq('listings.user_id', userId).gte('check_out', thirtyDaysAgo.toISOString()).order('check_out'),
      
      // Recent feedback for activity feed
      supabase.from('cleaner_feedback').select(`
        *,
        cleaners!inner(name),
        listings!inner(name, user_id),
        schedule_items!inner(check_out)
      `).eq('listings.user_id', userId).order('created_at', { ascending: false }).limit(5),
      
      // Upcoming cleanings
      supabase.from('schedule_items').select(`
        *,
        listings!inner(name, user_id),
        cleaners!inner(name)
      `).eq('listings.user_id', userId).gte('check_out', new Date().toISOString()).lte('check_out', sevenDaysFromNow.toISOString()).order('check_out').limit(10),
      
      // Sync status for listings
      supabase.from('listing_sync_status').select('*'),
      
      // Assignments for counting
      supabase.from('assignments').select('*, listings!inner(user_id)').eq('listings.user_id', userId)
    ])
    
    // Check for errors
    if (profileResult.error) throw profileResult.error
    if (listingsResult.error) throw listingsResult.error
    if (cleanersResult.error) throw cleanersResult.error
    if (scheduleResult.error) throw scheduleResult.error
    if (recentFeedbackResult.error) throw recentFeedbackResult.error
    if (upcomingCleaningsResult.error) throw upcomingCleaningsResult.error
    
    // Transform schedule data
    const scheduleItems = (scheduleResult.data || []).map((s: any) => ({
      ...s,
      listing_name: s.listings?.name,
      listing_timezone: s.listings?.timezone,
      cleaner_name: s.cleaners?.name,
      cleaner_phone: s.cleaners?.phone,
      source: s.source || 'airbnb',
      feedback_id: s.cleaner_feedback?.[0]?.id,
      cleanliness_rating: s.cleaner_feedback?.[0]?.cleanliness_rating,
      feedback_notes: s.cleaner_feedback?.[0]?.notes,
      feedback_completed_at: s.cleaner_feedback?.[0]?.completed_at
    }))
    
    // Calculate feedback statistics from schedule data
    const feedbackItems = scheduleItems.filter(s => s.feedback_id)
    const feedbackStats = {
      total_feedback: feedbackItems.length,
      clean_count: feedbackItems.filter(s => s.cleanliness_rating === 'clean').length,
      normal_count: feedbackItems.filter(s => s.cleanliness_rating === 'normal').length,
      dirty_count: feedbackItems.filter(s => s.cleanliness_rating === 'dirty').length,
      average_rating: null as number | null
    }
    
    if (feedbackStats.total_feedback > 0) {
      const sum = feedbackStats.clean_count * 3 + feedbackStats.normal_count * 2 + feedbackStats.dirty_count * 1
      feedbackStats.average_rating = Math.round(sum / feedbackStats.total_feedback * 100) / 100
    }
    
    // Merge sync status into listings
    const listingsWithSync = (listingsResult.data || []).map(listing => {
      const syncStatus = (syncStatusResult.data || []).find(s => s.listing_id === listing.id)
      return {
        ...listing,
        last_synced_at: syncStatus?.last_synced_at,
        last_sync_status: syncStatus?.last_sync_status,
        last_sync_error: syncStatus?.last_sync_error,
        total_cleanings: scheduleItems.filter(s => s.listing_id === listing.id).length
      }
    })
    
    // Add assignment counts to cleaners
    const cleanersWithCounts = (cleanersResult.data || []).map(cleaner => {
      const cleanerAssignments = (assignmentsResult.data || []).filter(a => a.cleaner_id === cleaner.id)
      const cleanerCleanings = scheduleItems.filter(s => s.cleaner_id === cleaner.id)
      return {
        ...cleaner,
        assignment_count: cleanerAssignments.length,
        total_cleanings: cleanerCleanings.length
      }
    })
    
    // Transform recent feedback
    const recentFeedback = (recentFeedbackResult.data || []).map((f: any) => ({
      ...f,
      cleaner_name: f.cleaners?.name,
      listing_name: f.listings?.name,
      cleaning_date: f.schedule_items?.check_out
    }))
    
    // Transform upcoming cleanings
    const upcomingCleanings = (upcomingCleaningsResult.data || []).map((s: any) => ({
      ...s,
      listing_name: s.listings?.name,
      cleaner_name: s.cleaners?.name
    }))
    
    // Calculate additional metrics
    const activeListings = listingsWithSync.filter(l => l.is_active_on_airbnb).length
    const totalCleanings = scheduleItems.length
    const completedCleanings = scheduleItems.filter(s => s.is_completed || s.feedback_id).length
    const todaysCleanings = scheduleItems.filter(s => {
      const checkOut = new Date(s.check_out)
      const today = new Date()
      return checkOut.toDateString() === today.toDateString()
    }).length
    
    // Calculate monthly revenue
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyCleanings = scheduleItems.filter(s => {
      const checkOut = new Date(s.check_out)
      return checkOut.getMonth() === currentMonth && checkOut.getFullYear() === currentYear
    })
    
    // Get cleaning fees from listings
    const listingFeesMap = new Map(listingsWithSync.map(l => [l.id, l.cleaning_fee || 0]))
    const monthlyRevenue = monthlyCleanings.reduce((sum, cleaning) => {
      const fee = listingFeesMap.get(cleaning.listing_id) || 0
      return sum + fee
    }, 0)
    
    return {
      profile: profileResult.data,
      listings: listingsWithSync,
      cleaners: cleanersWithCounts,
      schedule: scheduleItems,
      metrics: {
        totalListings: listingsWithSync.length,
        activeListings,
        totalCleaners: cleanersWithCounts.length,
        activeCleaners: cleanersWithCounts.filter(c => c.assignment_count > 0).length,
        totalCleanings,
        completedCleanings,
        todaysCleanings,
        monthlyRevenue,
        completionRate: totalCleanings > 0 ? Math.round((completedCleanings / totalCleanings) * 100) : 0,
      },
      feedbackStats,
      recentFeedback,
      upcomingCleanings,
    }
  } catch (error) {
    logger.error('Failed to fetch dashboard metrics', error)
    throw error
  }
}

export async function GET() {
  console.log('[Dashboard Metrics V2 API] Checking authentication')
  const user = await getCurrentUser()
  
  if (!user) {
    console.log('[Dashboard Metrics V2 API] No user found - returning 401')
    return NextResponse.json(
      { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }
  
  console.log('[Dashboard Metrics V2 API] User authenticated:', user.id)
  
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
    logger.error('Dashboard metrics error', error)
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to fetch dashboard metrics', 
          code: 'INTERNAL_ERROR' 
        } 
      },
      { status: 500 }
    )
  }
}