import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liveness probe endpoint
 * Returns 200 if the app is alive
 * This is a simple check that the app can respond to requests
 */
export async function GET() {
  return NextResponse.json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  })
}