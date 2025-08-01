/**
 * Optimized database client with connection pooling and monitoring
 * Replaces the basic db.ts for production use
 */

import { Pool, PoolConfig } from 'pg'
import { logger } from './logger-edge'

// Parse database URL to extract connection details
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Connection pool configuration for optimal performance
const poolConfig: PoolConfig = {
  connectionString,
  
  // Pool size configuration
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'), // Maximum pool size
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),  // Minimum pool size
  
  // Timeout configuration (in milliseconds)
  idleTimeoutMillis: 30000,        // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000,    // Fail if connection takes > 5 seconds
  query_timeout: 30000,             // Query timeout 30 seconds
  statement_timeout: 30000,         // Statement timeout 30 seconds
  
  // Connection behavior
  allowExitOnIdle: false,           // Keep the pool alive
}

// Create the connection pool
export const pool = new Pool(poolConfig)

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err)
})

// Development mode query monitoring
if (process.env.NODE_ENV === 'development') {
  let queryCount = 0
  const slowQueryThreshold = 100 // milliseconds

  pool.on('connect', (client) => {
    logger.debug('New database client connected')
  })

  pool.on('acquire', (client) => {
    logger.debug('Database client acquired from pool')
  })

  pool.on('remove', (client) => {
    logger.debug('Database client removed from pool')
  })

  // Wrap query method to add timing
  const originalQuery = pool.query.bind(pool)
  
  (pool as any).query = async function(...args: any[]) {
    const queryId = ++queryCount
    const startTime = Date.now()
    const query = typeof args[0] === 'string' ? args[0] : args[0].text
    const queryPreview = query.substring(0, 100) + (query.length > 100 ? '...' : '')
    
    logger.debug(`Query #${queryId} started`, { query: queryPreview })
    
    try {
      const result = await (originalQuery as any)(...args)
      const duration = Date.now() - startTime
      
      if (duration > slowQueryThreshold) {
        logger.warn(`Slow query detected #${queryId}`, {
          query: queryPreview,
          duration: `${duration}ms`,
          rows: result.rowCount
        })
      } else {
        logger.debug(`Query #${queryId} completed`, {
          duration: `${duration}ms`,
          rows: result.rowCount
        })
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`Query #${queryId} failed`, error as Error, {
        query: queryPreview,
        duration: `${duration}ms`
      })
      throw error
    }
  } as typeof pool.query
}

// Helper function to check pool health
export async function checkPoolHealth() {
  try {
    const result = await pool.query('SELECT NOW()')
    return {
      healthy: true,
      timestamp: result.rows[0].now,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount
    }
  } catch (error) {
    logger.error('Database pool health check failed', error as Error)
    return {
      healthy: false,
      error: (error as Error).message,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount
    }
  }
}

// Graceful shutdown
export async function closePool() {
  logger.info('Closing database connection pool')
  await pool.end()
}

// Handle process termination
process.on('SIGTERM', async () => {
  await closePool()
})

process.on('SIGINT', async () => {
  await closePool()
})

// Export query function for backward compatibility
export const query = pool.query.bind(pool)

// Export transaction helper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Export common query builders for better performance
export const queries = {
  // Dashboard metrics query - optimized with single CTE
  getDashboardMetrics: (userId: string) => ({
    text: `
      WITH metrics AS (
        SELECT 
          COUNT(DISTINCT listing_id) as total_listings,
          COUNT(*) FILTER (WHERE date = CURRENT_DATE) as cleanings_today,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '7 days') as cleanings_week
        FROM schedule_items
        WHERE user_id = $1 
          AND deleted_at IS NULL
      ),
      cleaner_count AS (
        SELECT COUNT(DISTINCT c.id) as total_cleaners
        FROM cleaners c
        WHERE c.user_id = $1 
          AND c.deleted_at IS NULL
      )
      SELECT 
        m.*,
        c.total_cleaners
      FROM metrics m, cleaner_count c
    `,
    values: [userId]
  }),

  // Schedule list query - optimized with proper indexes
  getScheduleList: (userId: string, startDate: string, endDate: string) => ({
    text: `
      SELECT 
        s.*,
        l.name as listing_name,
        l.address as listing_address,
        c.name as cleaner_name,
        c.phone as cleaner_phone,
        f.cleanliness_rating,
        f.notes as feedback_notes
      FROM schedule_items s
      LEFT JOIN listings l ON s.listing_id = l.id
      LEFT JOIN cleaners c ON s.cleaner_id = c.id
      LEFT JOIN feedback f ON f.schedule_item_id = s.id
      WHERE s.user_id = $1
        AND s.date >= $2
        AND s.date <= $3
        AND s.deleted_at IS NULL
      ORDER BY s.date, s.checkout_time
    `,
    values: [userId, startDate, endDate]
  })
}

export default pool