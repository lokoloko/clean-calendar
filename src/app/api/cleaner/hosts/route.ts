import { NextResponse } from 'next/server'
import { db } from '@/lib/db-edge'
import { validateCleanerSession, getCleanerToken } from '@/lib/cleaner-auth'
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
  try {
    const token = getCleanerToken(request)
    const session = await validateCleanerSession(token || null)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all cleaner records for this phone number
    const cleanerPhone = session.cleanerPhone
    const cleaners = await db.getCleanersByPhone(cleanerPhone)
    
    // Get host information and statistics for each cleaner record
    const today = new Date()
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(today)
    
    const hosts = await Promise.all(cleaners.map(async (cleaner) => {
      // Get user/host info
      const user = await db.getUser(cleaner.user_id)
      
      // Get property count for this user
      const listings = await db.getListings(cleaner.user_id)
      
      // Get upcoming cleanings count for this cleaner
      const schedule = await db.getCleanerSchedule(
        cleaner.id, 
        weekStart, 
        weekEnd
      )
      
      // Count today's cleanings
      const todayStart = startOfDay(today)
      const todayEnd = endOfDay(today)
      const todayCleanings = schedule.filter(item => {
        const checkOut = new Date(item.check_out)
        return checkOut >= todayStart && checkOut <= todayEnd
      })
      
      return {
        userId: cleaner.user_id,
        cleanerId: cleaner.id,
        hostName: user?.name || user?.email || 'Unknown Host',
        companyName: user?.company_name,
        propertyCount: listings.length,
        upcomingCleanings: schedule.length,
        todayCleanings: todayCleanings.length
      }
    }))
    
    // Sort by most cleanings first
    hosts.sort((a, b) => b.upcomingCleanings - a.upcomingCleanings)

    return NextResponse.json({
      cleanerPhone,
      hosts
    })
  } catch (error) {
    console.error('Error fetching cleaner hosts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hosts' },
      { status: 500 }
    )
  }
}