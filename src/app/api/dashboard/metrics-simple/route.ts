import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('[Simple Metrics API] Starting request')
  
  const user = await getCurrentUser()
  
  if (!user) {
    console.log('[Simple Metrics API] No user found - returning 401')
    return NextResponse.json(
      { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }
  
  console.log('[Simple Metrics API] User authenticated:', user.id)
  
  try {
    const supabase = await createClient()
    
    // Simple test query using Supabase client
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .limit(5)
    
    if (listingsError) {
      console.error('[Simple Metrics API] Listings query error:', listingsError)
      return NextResponse.json(
        { 
          error: { 
            message: 'Failed to fetch listings', 
            code: 'DATABASE_ERROR',
            details: listingsError.message
          } 
        },
        { status: 500 }
      )
    }
    
    console.log('[Simple Metrics API] Successfully fetched', listings?.length || 0, 'listings')
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      listings: listings || [],
      listingCount: listings?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Simple Metrics API] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: { 
          message: 'Internal server error', 
          code: 'INTERNAL_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
  }
}