import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'checking',
    checks: {
      environment: {
        status: 'unknown',
        details: {} as any
      },
      connection: {
        status: 'unknown',
        details: {} as any
      },
      auth: {
        status: 'unknown',
        details: {} as any
      },
      database: {
        status: 'unknown',
        details: {} as any
      }
    }
  }

  try {
    // Check environment variables
    checks.checks.environment.details = {
      NEXT_PUBLIC_USE_AUTH: process.env.NEXT_PUBLIC_USE_AUTH,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
      DATABASE_URL: process.env.DATABASE_URL ? 'present' : 'missing',
    }
    checks.checks.environment.status = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'healthy' : 'unhealthy'

    // Check Supabase client creation
    try {
      const supabase = await createClient()
      checks.checks.connection.status = 'healthy'
      checks.checks.connection.details = { clientCreated: true }

      // Check auth health
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          checks.checks.auth.status = 'degraded'
          checks.checks.auth.details = { error: error.message }
        } else {
          checks.checks.auth.status = 'healthy'
          checks.checks.auth.details = { 
            hasSession: !!session,
            canGetSession: true 
          }
        }
      } catch (authError: any) {
        checks.checks.auth.status = 'unhealthy'
        checks.checks.auth.details = { error: authError.message }
      }

      // Check database connectivity (if we're using auth)
      if (process.env.NEXT_PUBLIC_USE_AUTH === 'true') {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('count(*)', { count: 'exact', head: true })
          
          if (error) {
            checks.checks.database.status = 'unhealthy'
            checks.checks.database.details = { error: error.message }
          } else {
            checks.checks.database.status = 'healthy'
            checks.checks.database.details = { canQuery: true }
          }
        } catch (dbError: any) {
          checks.checks.database.status = 'unhealthy'
          checks.checks.database.details = { error: dbError.message }
        }
      } else {
        checks.checks.database.status = 'not_applicable'
        checks.checks.database.details = { reason: 'Auth disabled' }
      }

    } catch (clientError: any) {
      checks.checks.connection.status = 'unhealthy'
      checks.checks.connection.details = { error: clientError.message }
    }

    // Overall status
    const statuses = Object.values(checks.checks).map(c => c.status)
    if (statuses.includes('unhealthy')) {
      checks.status = 'unhealthy'
    } else if (statuses.includes('degraded')) {
      checks.status = 'degraded'
    } else {
      checks.status = 'healthy'
    }

    return NextResponse.json(checks, {
      status: checks.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  }
}