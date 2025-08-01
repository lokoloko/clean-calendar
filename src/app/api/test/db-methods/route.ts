import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  const results: any = {
    timestamp: new Date().toISOString(),
    userId: user.id,
    tests: {}
  }
  
  // Test 1: Simple query
  try {
    const queryResult = await db.query('SELECT NOW() as now')
    results.tests.simpleQuery = {
      success: true,
      result: queryResult.rows[0]
    }
  } catch (error: any) {
    results.tests.simpleQuery = {
      success: false,
      error: error.message
    }
  }
  
  // Test 2: Helper method - getProfile
  try {
    const profile = await db.getProfile(user.id)
    results.tests.getProfile = {
      success: true,
      hasProfile: !!profile,
      email: profile?.email
    }
  } catch (error: any) {
    results.tests.getProfile = {
      success: false,
      error: error.message
    }
  }
  
  // Test 3: Helper method - getListings
  try {
    const listings = await db.getListings(user.id)
    results.tests.getListings = {
      success: true,
      count: listings.length
    }
  } catch (error: any) {
    results.tests.getListings = {
      success: false,
      error: error.message
    }
  }
  
  // Test 4: Helper method - getCleaners
  try {
    const cleaners = await db.getCleaners(user.id)
    results.tests.getCleaners = {
      success: true,
      count: cleaners.length
    }
  } catch (error: any) {
    results.tests.getCleaners = {
      success: false,
      error: error.message
    }
  }
  
  // Overall success
  results.allPassed = Object.values(results.tests).every((test: any) => test.success)
  
  return NextResponse.json(results, {
    status: results.allPassed ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}