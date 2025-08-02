import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'

// Simple in-memory cache for stats
const statsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    const user = await requireAuth()
    
    // Check cache first
    const cached = statsCache.get(user.id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }
    
    const supabase = await createClient()
    
    // Get date ranges
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    // Run optimized queries in parallel
    const [
      listingsResult,
      scheduleResult,
      cleanersResult,
      feedbackResult
    ] = await Promise.all([
      // Get all listings with cleaning fees
      supabase
        .from('listings')
        .select('id, name, cleaning_fee, created_at')
        .eq('user_id', user.id),
      
      // Get schedule items for last 6 months only
      supabase
        .from('schedule_items')
        .select(`
          id,
          listing_id,
          cleaner_id,
          check_out,
          status,
          is_completed,
          listings!inner(user_id)
        `)
        .eq('listings.user_id', user.id)
        .gte('check_out', sixMonthsAgo.toISOString())
        .order('check_out', { ascending: false }),
      
      // Get cleaners
      supabase
        .from('cleaners')
        .select('id, name')
        .eq('user_id', user.id),
      
      // Get feedback for last 6 months
      supabase
        .from('cleaner_feedback')
        .select(`
          id,
          cleanliness_rating,
          created_at,
          schedule_item_id,
          schedule_items!inner(
            listing_id,
            cleaner_id,
            check_out,
            listings!inner(user_id)
          )
        `)
        .eq('schedule_items.listings.user_id', user.id)
        .gte('created_at', sixMonthsAgo.toISOString())
    ])
    
    // Process results
    const listings = listingsResult.data || []
    const schedule = scheduleResult.data || []
    const cleaners = cleanersResult.data || []
    const feedback = feedbackResult.data || []
    
    // Calculate current month stats
    const currentMonthSchedule = schedule.filter(s => {
      const checkOut = new Date(s.check_out)
      return checkOut.getMonth() === currentMonth && checkOut.getFullYear() === currentYear
    })
    
    const currentMonthFeedback = feedback.filter(f => {
      const created = new Date(f.created_at)
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear
    })
    
    // Create lookup maps for performance
    const listingFeesMap = new Map(listings.map(l => [l.id, l.cleaning_fee || 0]))
    const cleanerNameMap = new Map(cleaners.map(c => [c.id, c.name]))
    
    // Calculate monthly stats for months with data
    const monthlyStats: any[] = []
    const monthsWithData = new Set<string>()
    
    // Find all months that have data
    schedule.forEach(s => {
      const checkOut = new Date(s.check_out)
      const monthKey = `${checkOut.getFullYear()}-${String(checkOut.getMonth() + 1).padStart(2, '0')}`
      monthsWithData.add(monthKey)
    })
    
    // Sort months and process each one
    Array.from(monthsWithData).sort().forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number)
      const monthDate = new Date(year, month - 1, 1)
      
      const monthSchedule = schedule.filter(s => {
        const checkOut = new Date(s.check_out)
        return checkOut.getMonth() === month - 1 && checkOut.getFullYear() === year
      })
      
      const monthFeedback = feedback.filter(f => {
        const created = new Date(f.created_at)
        return created.getMonth() === month - 1 && created.getFullYear() === year
      })
      
      const revenue = monthSchedule.reduce((sum, s) => {
        return sum + (listingFeesMap.get(s.listing_id) || 0)
      }, 0)
      
      // Only include months that have actual cleanings
      if (monthSchedule.length > 0) {
        monthlyStats.push({
          month: monthKey,
          total_cleanings: monthSchedule.length,
          completed_cleanings: monthSchedule.filter(s => s.is_completed || s.status === 'completed').length,
          total_revenue: revenue,
          feedback_count: monthFeedback.length,
          clean_count: monthFeedback.filter(f => f.cleanliness_rating === 'clean').length,
          normal_count: monthFeedback.filter(f => f.cleanliness_rating === 'normal').length,
          dirty_count: monthFeedback.filter(f => f.cleanliness_rating === 'dirty').length
        })
      }
    })
    
    // Calculate cleaner performance
    const cleanerStats = new Map()
    schedule.forEach(s => {
      if (!s.cleaner_id) return
      
      const stats = cleanerStats.get(s.cleaner_id) || {
        cleaner_id: s.cleaner_id,
        cleaner_name: cleanerNameMap.get(s.cleaner_id) || 'Unknown',
        total_cleanings: 0,
        completed_cleanings: 0,
        feedback_count: 0,
        ratings: { clean: 0, normal: 0, dirty: 0 }
      }
      
      stats.total_cleanings++
      if (s.is_completed || s.status === 'completed') {
        stats.completed_cleanings++
      }
      
      cleanerStats.set(s.cleaner_id, stats)
    })
    
    // Add feedback to cleaner stats
    feedback.forEach((f: any) => {
      const cleanerId = f.schedule_items?.cleaner_id
      if (!cleanerId) return
      
      const stats = cleanerStats.get(cleanerId)
      if (stats) {
        stats.feedback_count++
        if (f.cleanliness_rating === 'clean') stats.ratings.clean++
        else if (f.cleanliness_rating === 'normal') stats.ratings.normal++
        else if (f.cleanliness_rating === 'dirty') stats.ratings.dirty++
      }
    })
    
    // Convert to array and calculate metrics
    const topCleaners = Array.from(cleanerStats.values())
      .map(stats => ({
        ...stats,
        completion_rate: stats.total_cleanings > 0 
          ? Math.round((stats.completed_cleanings / stats.total_cleanings) * 100)
          : 0,
        average_rating: stats.feedback_count > 0
          ? ((stats.ratings.clean * 3 + stats.ratings.normal * 2 + stats.ratings.dirty * 1) / stats.feedback_count).toFixed(1)
          : null
      }))
      .sort((a, b) => b.total_cleanings - a.total_cleanings)
      .slice(0, 5)
    
    // Calculate current month revenue
    const currentMonthRevenue = currentMonthSchedule.reduce((sum, s) => {
      return sum + (listingFeesMap.get(s.listing_id) || 0)
    }, 0)
    
    // Calculate feedback stats
    const feedbackStats = {
      total: currentMonthFeedback.length,
      clean: currentMonthFeedback.filter(f => f.cleanliness_rating === 'clean').length,
      normal: currentMonthFeedback.filter(f => f.cleanliness_rating === 'normal').length,
      dirty: currentMonthFeedback.filter(f => f.cleanliness_rating === 'dirty').length
    }
    
    // Completion rate
    const completedCleanings = currentMonthSchedule.filter(s => 
      s.is_completed || s.status === 'completed'
    ).length
    const completionRate = currentMonthSchedule.length > 0 
      ? Math.round((completedCleanings / currentMonthSchedule.length) * 100)
      : 0
    
    const result = {
      listings,
      cleaners,
      summary: {
        totalListings: listings.length,
        totalCleanings: currentMonthSchedule.length,
        completedCleanings,
        monthlyRevenue: currentMonthRevenue,
        completionRate,
        feedbackStats,
        averageRating: feedbackStats.total > 0
          ? ((feedbackStats.clean * 3 + feedbackStats.normal * 2 + feedbackStats.dirty * 1) / feedbackStats.total).toFixed(1)
          : null
      },
      monthlyStats, // Already sorted by month
      topCleaners,
      // Limited schedule data for client-side processing
      schedule: schedule.slice(0, 500),
      feedback: feedback.slice(0, 200)
    }
    
    // Update cache
    statsCache.set(user.id, {
      data: result,
      timestamp: Date.now()
    })
    
    // Clean up old cache entries
    if (statsCache.size > 50) {
      const now = Date.now()
      for (const [key, value] of statsCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          statsCache.delete(key)
        }
      }
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}