import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env, validateEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * Readiness probe endpoint
 * Returns 200 if the app is ready to receive traffic
 * Returns 503 if the app is not ready
 */
export async function GET() {
  const checks: Record<string, boolean> = {
    environment: false,
    database: false,
  }

  // Check environment variables
  try {
    validateEnv()
    checks.environment = true
  } catch (error) {
    console.error('Environment check failed:', error)
  }

  // Check database connection and migrations
  try {
    // Check if we can query the database
    const result = await db.query('SELECT COUNT(*) FROM public.listings')
    checks.database = true
  } catch (error) {
    console.error('Database check failed:', error)
  }

  const isReady = Object.values(checks).every(check => check === true)

  return NextResponse.json(
    {
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: isReady ? 200 : 503 }
  )
}