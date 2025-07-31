import { NextRequest, NextResponse } from 'next/server'
import { getCachedDashboardMetrics, getCachedSchedule, getCachedListings, getCachedCleaners } from '@/lib/cache'
import { getCurrentUserId } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { format, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.api('GET', '/api/dashboard/metrics', { userId })

    // Define date ranges
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const weekStart = format(now, 'yyyy-MM-dd')
    const weekEnd = format(addDays(now, 7), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    // Fetch all data in parallel using cached functions
    const [
      metrics,
      listings,
      cleaners,
      todaySchedule,
      weekSchedule,
      monthSchedule
    ] = await Promise.all([
      getCachedDashboardMetrics(userId),
      getCachedListings(userId),
      getCachedCleaners(userId),
      getCachedSchedule(userId, today, today),
      getCachedSchedule(userId, weekStart, weekEnd),
      getCachedSchedule(userId, monthStart, monthEnd),
    ])

    // Process today's cleanings
    const todayCleanings = todaySchedule.map((item: any) => ({
      id: item.id,
      listing_name: item.listing_name || 'Unknown',
      cleaner_name: item.cleaner_name || 'Unassigned',
      checkout_time: item.checkout_time || '11:00 AM',
      status: item.cleaner_id ? 'assigned' : 'needs_cleaner',
      has_feedback: !!item.feedback_notes
    }))

    // Process attention items (cleanings without cleaners)
    const needsAttention = weekSchedule
      .filter((item: any) => !item.cleaner_id && item.status !== 'cancelled')
      .map((item: any) => ({
        id: item.id,
        listing_name: item.listing_name || 'Unknown',
        issue: 'No cleaner assigned',
        checkout_date: item.date
      }))

    // Calculate monthly revenue from completed cleanings
    const monthlyRevenue = monthSchedule
      .filter((item: any) => {
        const itemDate = new Date(item.date)
        return itemDate <= now && item.status !== 'cancelled'
      })
      .reduce((sum, item: any) => {
        const listing = listings.find((l: any) => l.id === item.listing_id)
        return sum + (listing?.cleaningFee || 0)
      }, 0)

    // Get last sync time from listings
    const lastSyncTime = listings
      .filter((l: any) => l.last_sync_at)
      .map((l: any) => new Date(l.last_sync_at))
      .sort((a, b) => b.getTime() - a.getTime())[0] || null

    // Build recent activity
    const recentActivity = []

    // Add recent sync activity
    if (lastSyncTime && (now.getTime() - lastSyncTime.getTime()) < 24 * 60 * 60 * 1000) {
      recentActivity.push({
        id: 'sync-' + lastSyncTime.getTime(),
        type: 'sync',
        title: 'Calendar Synced',
        description: `All calendars synced successfully`,
        timestamp: lastSyncTime,
        icon: 'RefreshCw'
      })
    }

    // Add recent feedback
    const recentFeedback = todaySchedule
      .filter((item: any) => item.cleanliness_rating)
      .slice(0, 3)
      .map((item: any) => ({
        id: 'feedback-' + item.id,
        type: 'feedback',
        title: 'Feedback Received',
        description: `${item.listing_name} - ${
          item.cleanliness_rating === 'clean' ? '😊 Clean' :
          item.cleanliness_rating === 'normal' ? '😐 Normal' : '😟 Dirty'
        }`,
        timestamp: new Date(item.date),
        icon: 'MessageSquare'
      }))
    
    recentActivity.push(...recentFeedback)

    // Add completed cleanings from today
    const completedToday = todaySchedule
      .filter((item: any) => item.cleaner_id)
      .slice(0, 3)
      .map((item: any) => ({
        id: 'completed-' + item.id,
        type: 'cleaning_completed',
        title: 'Cleaning Scheduled',
        description: `${item.listing_name} - ${item.cleaner_name}`,
        timestamp: new Date(item.date),
        icon: 'CheckCircle2'
      }))
    
    recentActivity.push(...completedToday)

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Build response
    const response = {
      stats: {
        totalListings: listings.length,
        activeCleaners: cleaners.length,
        upcomingCleanings: weekSchedule.filter((item: any) => item.status !== 'cancelled').length,
        monthlyRevenue: Math.round(monthlyRevenue)
      },
      todayCleanings: todayCleanings.slice(0, 5),
      needsAttention: needsAttention.slice(0, 5),
      recentActivity: recentActivity.slice(0, 10),
      lastSyncTime: lastSyncTime?.toISOString() || null,
      metrics: {
        cleaningsToday: metrics?.cleanings_today || 0,
        cleaningsWeek: metrics?.cleanings_week || 0,
        cleaningsMonth: metrics?.cleanings_month || 0,
        totalFeedback: metrics?.total_feedback || 0,
        avgRating: metrics?.avg_rating || null
      }
    }

    const duration = Date.now() - startTime
    logger.info('Dashboard metrics loaded', { userId, duration: `${duration}ms` })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to load dashboard metrics', error as Error)
    return NextResponse.json(
      { error: 'Failed to load dashboard metrics' },
      { status: 500 }
    )
  }
}