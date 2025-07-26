import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
    checks: {
      database: 'checking',
      memory: 'checking',
    },
    uptime: process.uptime(),
  }

  try {
    // Check database connection
    const dbStart = Date.now()
    await db.query('SELECT 1')
    health.checks.database = `healthy (${Date.now() - dbStart}ms)`
  } catch (error) {
    health.status = 'unhealthy'
    health.checks.database = 'unhealthy'
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

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503
  
  return NextResponse.json(health, { status: statusCode })
}