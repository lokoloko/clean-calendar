import { Pool, PoolConfig } from 'pg'
import { env } from './env'
import { logger } from './logger'

/**
 * Production-ready database configuration with proper pooling
 */

// Parse database URL to get connection details
function parseConnectionString(connectionString: string): PoolConfig {
  try {
    const url = new URL(connectionString)
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
    }
  } catch (error) {
    logger.error('Failed to parse database connection string', error)
    throw new Error('Invalid DATABASE_URL')
  }
}

// Create pool configuration optimized for serverless
const poolConfig: PoolConfig = {
  ...parseConnectionString(env.databaseUrl || ''),
  
  // Connection pool settings for serverless environments
  max: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '25'), // Max connections
  min: 0, // Allow scale to zero
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DATABASE_POOL_TIMEOUT || '60') * 1000,
  
  // Statement timeout to prevent long-running queries
  statement_timeout: 30000, // 30 seconds
  
  // Application name for monitoring
  application_name: 'clean-calendar',
}

// Create pool instance
let pool: Pool | null = null

/**
 * Get or create database pool
 * Implements singleton pattern for connection reuse
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig)
    
    // Pool event handlers
    pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err)
    })
    
    pool.on('connect', () => {
      logger.debug('New database connection established')
    })
    
    pool.on('acquire', () => {
      const poolStats = {
        total: pool!.totalCount,
        idle: pool!.idleCount,
        waiting: pool!.waitingCount,
      }
      logger.debug('Database connection acquired', { metadata: poolStats })
    })
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Shutting down database pool')
      if (pool) {
        await pool.end()
        pool = null
      }
    }
    
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)
  }
  
  return pool
}

/**
 * Execute a query with automatic retries and logging
 */
export async function query<T = any>(
  text: string,
  params?: any[],
  retries = 2
): Promise<{ rows: T[]; rowCount: number }> {
  const startTime = Date.now()
  const queryLogger = logger.child({ 
    action: 'db.query',
    query: env.isDevelopment ? text.substring(0, 100) : undefined 
  })
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const pool = getPool()
      const result = await pool.query<T>(text, params)
      
      queryLogger.debug('Query executed successfully', {
        metadata: {
          duration: Date.now() - startTime,
          rowCount: result.rowCount,
          attempt: attempt + 1,
        }
      })
      
      return result
    } catch (error: any) {
      const isRetryable = 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === '57P03' // Cannot acquire connection
      
      if (attempt < retries && isRetryable) {
        queryLogger.warn(`Query failed, retrying (${attempt + 1}/${retries + 1})`, {
          metadata: { error: error.message }
        })
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      } else {
        queryLogger.error('Query failed', error, {
          metadata: {
            duration: Date.now() - startTime,
            attempts: attempt + 1,
          }
        })
        throw error
      }
    }
  }
  
  throw new Error('Query failed after all retries')
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  const transactionLogger = logger.child({ action: 'db.transaction' })
  
  try {
    await client.query('BEGIN')
    transactionLogger.debug('Transaction started')
    
    const result = await callback(client)
    
    await client.query('COMMIT')
    transactionLogger.debug('Transaction committed')
    
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    transactionLogger.error('Transaction rolled back', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Health check for database connection
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health')
    return result.rows[0]?.health === 1
  } catch (error) {
    logger.error('Database health check failed', error)
    return false
  }
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  const pool = getPool()
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }
}