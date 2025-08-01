import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_URL: process.env.DATABASE_URL ? 'present' : 'missing',
      DATABASE_URL_PREVIEW: process.env.DATABASE_URL?.substring(0, 30) + '...'
    },
    database: await db.checkHealth()
  }

  const status = healthCheck.database.healthy ? 200 : 503

  return NextResponse.json(healthCheck, { 
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}