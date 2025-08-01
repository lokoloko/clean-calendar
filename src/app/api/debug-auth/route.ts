import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { db } from '@/lib/db-edge'

export async function GET() {
  try {
    // Get current user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message 
      }, { status: 401 })
    }
    
    // Check profile
    const profile = await db.getUser(user.id)
    
    // Count user's data
    const listings = await db.query(
      'SELECT COUNT(*) as count FROM public.listings WHERE user_id = $1',
      [user.id]
    )
    
    const cleaners = await db.query(
      'SELECT COUNT(*) as count FROM public.cleaners WHERE user_id = $1',
      [user.id]
    )
    
    // Check if data exists under dev user
    const devListings = await db.query(
      'SELECT COUNT(*) as count FROM public.listings WHERE user_id = $1',
      ['00000000-0000-0000-0000-000000000001']
    )
    
    // Check all user IDs that have listings
    const allUsers = await db.query(`
      SELECT user_id, COUNT(*) as count 
      FROM public.listings 
      GROUP BY user_id 
      ORDER BY count DESC
    `)
    
    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        profileExists: !!profile,
        profileData: profile
      },
      dataCount: {
        listings: listings.rows[0]?.count || 0,
        cleaners: cleaners.rows[0]?.count || 0
      },
      devUserData: {
        listings: devListings.rows[0]?.count || 0
      },
      allUsersWithListings: allUsers.rows
    })
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}