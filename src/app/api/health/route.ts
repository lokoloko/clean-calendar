import { NextResponse } from 'next/server'
import { db } from '@/lib/db-edge'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
    checks: {
      database: 'checking',
      authentication: 'checking',
      supabase: 'checking',
      memory: 'checking',
      environment: 'checking'
    },
    uptime: process.uptime(),
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    const result = await db.checkHealth()
    health.checks.database = result.healthy 
      ? `healthy (${Date.now() - dbStart}ms)` 
      : 'unhealthy'
  } catch (error) {
    health.status = 'unhealthy'
    health.checks.database = `error: ${error instanceof Error ? error.message : 'unknown'}`
  }

  // Check authentication
  try {
    const user = await getCurrentUser()
    health.checks.authentication = user 
      ? `authenticated (${user.email})` 
      : 'not authenticated'
  } catch (error) {
    health.checks.authentication = `error: ${error instanceof Error ? error.message : 'unknown'}`
  }

  // Check Supabase client
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      health.checks.supabase = `error: ${error.message}`
    } else {
      health.checks.supabase = data?.session ? 'connected with session' : 'connected (no session)'
    }
  } catch (error) {
    health.checks.supabase = `error: ${error instanceof Error ? error.message : 'unknown'}`
  }

  // Check memory usage
  const memUsage = process.memoryUsage()
  const memoryUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
  }
  
  health.checks.memory = `healthy (${memoryUsageMB.heapUsed}MB/${memoryUsageMB.heapTotal}MB)`

  // Check environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_USE_AUTH'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    health.status = 'unhealthy'
    health.checks.environment = `missing: ${missingVars.join(', ')}`
  } else {
    const authMode = process.env.NEXT_PUBLIC_USE_AUTH === 'false' ? 'dev mode' : 'production mode'
    health.checks.environment = `all present (${authMode})`
  }

  // Determine overall health
  const hasErrors = Object.values(health.checks).some(check => 
    typeof check === 'string' && (check.includes('error') || check.includes('unhealthy') || check.includes('missing'))
  )
  
  if (hasErrors) {
    health.status = 'unhealthy'
  }

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503
  
  return NextResponse.json(health, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}