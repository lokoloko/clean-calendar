import { Pool, PoolClient } from 'pg'
import { logger } from './logger'

// Parse database URL and configure SSL for production
const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cleansweep'
  
  // For production, ensure SSL is configured properly
  if (process.env.NODE_ENV === 'production') {
    return {
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for some cloud providers
      }
    }
  }
  
  return {
    connectionString
  }
}

// Optimized connection pool configuration
const pool = new Pool({
  ...getDatabaseConfig(),
  // Connection pool settings
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  min: process.env.NODE_ENV === 'production' ? 2 : 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Query timeouts
  statement_timeout: 30000,
  query_timeout: 30000,
})

// Monitor pool health
pool.on('error', (err) => {
  logger.error('Database pool error', err)
})

pool.on('connect', () => {
  logger.debug('Database connection established')
})

pool.on('remove', () => {
  logger.debug('Database connection removed')
})

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  
  // Transaction support
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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
  },
  
  // Helper methods for common operations
  async getUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.profiles WHERE id = $1',
      [userId]
    )
    return result.rows[0]
  },
  
  async getProfile(userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.profiles WHERE id = $1',
      [userId]
    )
    return result.rows[0]
  },
  
  async createProfile(userId: string, email: string) {
    const result = await pool.query(
      `INSERT INTO public.profiles (id, email) 
       VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET email = $2
       RETURNING *`,
      [userId, email]
    )
    return result.rows[0]
  },
  
  async getListings(userId: string, includeInactive = false) {
    const query = includeInactive 
      ? 'SELECT * FROM public.listings WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM public.listings WHERE user_id = $1 AND is_active_on_airbnb = true ORDER BY created_at DESC'
    
    const result = await pool.query(query, [userId])
    return result.rows
  },
  
  async getListing(id: string, userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.listings WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return result.rows[0]
  },
  
  async createListing(data: {
    userId: string
    name: string
    icsUrl?: string | null
    timezone?: string
    checkInTime?: string
    checkOutTime?: string
    isActiveOnAirbnb?: boolean
  }) {
    const result = await pool.query(
      `INSERT INTO public.listings 
       (user_id, name, ics_url, timezone, check_in_time, check_out_time, is_active_on_airbnb)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId,
        data.name,
        data.icsUrl || null,
        data.timezone || 'America/Los_Angeles',
        data.checkInTime || '15:00',
        data.checkOutTime || '11:00',
        data.isActiveOnAirbnb !== undefined ? data.isActiveOnAirbnb : true
      ]
    )
    return result.rows[0]
  },
  
  async updateListing(
    id: string,
    userId: string,
    data: {
      name?: string
      icsUrl?: string | null
      timezone?: string
      checkInTime?: string
      checkOutTime?: string
      isActiveOnAirbnb?: boolean
    }
  ) {
    const fields = []
    const values = []
    let paramCount = 1
    
    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`)
      values.push(data.name)
    }
    if (data.icsUrl !== undefined) {
      fields.push(`ics_url = $${paramCount++}`)
      values.push(data.icsUrl)
    }
    if (data.timezone !== undefined) {
      fields.push(`timezone = $${paramCount++}`)
      values.push(data.timezone)
    }
    if (data.checkInTime !== undefined) {
      fields.push(`check_in_time = $${paramCount++}`)
      values.push(data.checkInTime)
    }
    if (data.checkOutTime !== undefined) {
      fields.push(`check_out_time = $${paramCount++}`)
      values.push(data.checkOutTime)
    }
    if (data.isActiveOnAirbnb !== undefined) {
      fields.push(`is_active_on_airbnb = $${paramCount++}`)
      values.push(data.isActiveOnAirbnb)
    }
    
    if (fields.length === 0) {
      return null
    }
    
    values.push(id, userId)
    
    const result = await pool.query(
      `UPDATE public.listings 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    )
    return result.rows[0]
  },
  
  async deleteListing(id: string, userId: string) {
    const result = await pool.query(
      'DELETE FROM public.listings WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    )
    return result.rows[0]
  },
  
  async getCleaners(userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.cleaners WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return result.rows
  },
  
  async getCleaner(id: string, userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.cleaners WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return result.rows[0]
  },
  
  async createCleaner(data: {
    userId: string
    name: string
    phone?: string
    email?: string
  }) {
    const result = await pool.query(
      `INSERT INTO public.cleaners (user_id, name, phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userId, data.name, data.phone || null, data.email || null]
    )
    return result.rows[0]
  },
  
  async updateCleaner(
    id: string,
    userId: string,
    data: {
      name?: string
      phone?: string
      email?: string
    }
  ) {
    const fields = []
    const values = []
    let paramCount = 1
    
    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`)
      values.push(data.name)
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`)
      values.push(data.phone)
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`)
      values.push(data.email)
    }
    
    if (fields.length === 0) {
      return null
    }
    
    values.push(id, userId)
    
    const result = await pool.query(
      `UPDATE public.cleaners 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    )
    return result.rows[0]
  },
  
  async deleteCleaner(id: string, userId: string) {
    const result = await pool.query(
      'DELETE FROM public.cleaners WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    )
    return result.rows[0]
  },
  
  async getAssignments(userId: string) {
    const result = await pool.query(
      `SELECT a.*, l.name as listing_name, c.name as cleaner_name
       FROM public.assignments a
       JOIN public.listings l ON a.listing_id = l.id
       JOIN public.cleaners c ON a.cleaner_id = c.id
       WHERE l.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    )
    return result.rows
  },
  
  async createAssignment(data: {
    listingId: string
    cleanerId: string
    userId: string
  }) {
    // Verify ownership
    const ownership = await pool.query(
      `SELECT 
        (SELECT user_id FROM public.listings WHERE id = $1) as listing_owner,
        (SELECT user_id FROM public.cleaners WHERE id = $2) as cleaner_owner`,
      [data.listingId, data.cleanerId]
    )
    
    const { listing_owner, cleaner_owner } = ownership.rows[0]
    
    if (listing_owner !== data.userId || cleaner_owner !== data.userId) {
      throw new Error('Unauthorized')
    }
    
    const result = await pool.query(
      `INSERT INTO public.assignments (listing_id, cleaner_id)
       VALUES ($1, $2)
       RETURNING *`,
      [data.listingId, data.cleanerId]
    )
    return result.rows[0]
  },
  
  async deleteAssignment(id: string, userId: string) {
    const result = await pool.query(
      `DELETE FROM public.assignments a
       USING public.listings l
       WHERE a.listing_id = l.id 
       AND a.id = $1 
       AND l.user_id = $2
       RETURNING a.*`,
      [id, userId]
    )
    return result.rows[0]
  },
  
  async getScheduleItems(userId: string, filters?: {
    startDate?: Date
    endDate?: Date
    listingId?: string
    cleanerId?: string
  }) {
    let query = `
      SELECT s.*, l.name as listing_name, c.name as cleaner_name
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      JOIN public.cleaners c ON s.cleaner_id = c.id
      WHERE l.user_id = $1`
    
    const params: any[] = [userId]
    let paramCount = 2
    
    if (filters?.startDate) {
      query += ` AND s.check_out >= $${paramCount++}`
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      query += ` AND s.check_out <= $${paramCount++}`
      params.push(filters.endDate)
    }
    
    if (filters?.listingId) {
      query += ` AND s.listing_id = $${paramCount++}`
      params.push(filters.listingId)
    }
    
    if (filters?.cleanerId) {
      query += ` AND s.cleaner_id = $${paramCount++}`
      params.push(filters.cleanerId)
    }
    
    query += ' ORDER BY s.check_out ASC'
    
    const result = await pool.query(query, params)
    return result.rows
  },
  
  async updateScheduleItem(
    id: string,
    userId: string,
    data: {
      cleanerId?: string
      isCompleted?: boolean
    }
  ) {
    const fields = []
    const values = []
    let paramCount = 1
    
    if (data.cleanerId !== undefined) {
      fields.push(`cleaner_id = $${paramCount++}`)
      values.push(data.cleanerId)
    }
    if (data.isCompleted !== undefined) {
      fields.push(`is_completed = $${paramCount++}`)
      values.push(data.isCompleted)
    }
    
    if (fields.length === 0) {
      return null
    }
    
    values.push(id, userId)
    
    const result = await pool.query(
      `UPDATE public.schedule_items s
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       FROM public.listings l
       WHERE s.listing_id = l.id
       AND s.id = $${paramCount} 
       AND l.user_id = $${paramCount + 1}
       RETURNING s.*`,
      values
    )
    return result.rows[0]
  },
  
  // Pool health check
  async checkHealth() {
    try {
      const result = await pool.query('SELECT NOW()')
      return { healthy: true, timestamp: result.rows[0].now }
    } catch (error) {
      logger.error('Database health check failed', error)
      return { healthy: false, error }
    }
  },
  
  // Graceful shutdown
  async close() {
    await pool.end()
  }
}