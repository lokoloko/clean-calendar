import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    // Test 1: Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
      NEXT_PUBLIC_USE_AUTH: process.env.NEXT_PUBLIC_USE_AUTH,
    }
    
    // Test 2: Get user from auth
    let authUser = null
    let authError = null
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      authUser = user
      authError = error
    } catch (e) {
      authError = e instanceof Error ? e.message : 'Unknown error'
    }
    
    // Test 3: Get user through our helper
    let helperUser = null
    let helperError = null
    try {
      helperUser = await getCurrentUser()
    } catch (e) {
      helperError = e instanceof Error ? e.message : 'Unknown error'
    }
    
    // Test 4: Direct database query (if we have a user)
    let dbTest = null
    if (authUser?.id) {
      try {
        const { Pool } = await import('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL
        })
        const result = await pool.query(
          'SELECT COUNT(*) as count FROM public.listings WHERE user_id = $1',
          [authUser.id]
        )
        dbTest = {
          listings: result.rows[0]?.count || 0,
          userId: authUser.id
        }
        await pool.end()
      } catch (e) {
        dbTest = { error: e instanceof Error ? e.message : 'Unknown error' }
      }
    }
    
    return NextResponse.json({
      envCheck,
      authTest: {
        user: authUser ? { id: authUser.id, email: authUser.email } : null,
        error: authError
      },
      helperTest: {
        user: helperUser ? { id: helperUser.id, email: helperUser.email } : null,
        error: helperError
      },
      dbTest
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}