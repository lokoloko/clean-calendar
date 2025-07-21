import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cleansweep',
})

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  
  // Helper methods for common operations
  async getUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.profiles WHERE id = $1',
      [userId]
    )
    return result.rows[0]
  },

  async getListings(userId: string) {
    const result = await pool.query(
      'SELECT * FROM public.listings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return result.rows
  },

  async createListing(userId: string, data: { name: string; ics_url?: string | null; cleaning_fee?: number; timezone?: string; is_active_on_airbnb?: boolean }) {
    const result = await pool.query(
      'INSERT INTO public.listings (user_id, name, ics_url, cleaning_fee, timezone, is_active_on_airbnb) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, data.name, data.ics_url || null, data.cleaning_fee || 0, data.timezone || 'America/New_York', data.is_active_on_airbnb !== false]
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

  async createCleaner(userId: string, data: { name: string; phone?: string; email?: string }) {
    const result = await pool.query(
      'INSERT INTO public.cleaners (user_id, name, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, data.name, data.phone, data.email]
    )
    return result.rows[0]
  },

  async getAssignments(userId: string) {
    const result = await pool.query(`
      SELECT a.*, l.name as listing_name, c.name as cleaner_name
      FROM public.assignments a
      JOIN public.listings l ON a.listing_id = l.id
      JOIN public.cleaners c ON a.cleaner_id = c.id
      WHERE l.user_id = $1
      ORDER BY a.created_at DESC
    `, [userId])
    return result.rows
  },

  async getSchedule(userId: string) {
    const result = await pool.query(`
      SELECT s.*, 
             l.name as listing_name, 
             l.timezone as listing_timezone, 
             c.name as cleaner_name, 
             c.phone as cleaner_phone,
             COALESCE(s.source, 'airbnb') as source,
             s.original_check_in,
             s.original_check_out,
             s.cancelled_at,
             s.is_extended,
             s.extension_notes,
             s.extension_count,
             s.modification_history
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      JOIN public.cleaners c ON s.cleaner_id = c.id
      WHERE l.user_id = $1 
        AND s.check_out >= CURRENT_DATE - INTERVAL '30 days'  -- Include last 30 days of history
      ORDER BY s.check_out ASC
    `, [userId])
    return result.rows
  },

  async getAllSchedule(userId: string) {
    const result = await pool.query(`
      SELECT s.*, 
             l.name as listing_name, 
             l.timezone as listing_timezone, 
             c.name as cleaner_name, 
             c.phone as cleaner_phone,
             COALESCE(s.source, 'airbnb') as source,
             s.original_check_in,
             s.original_check_out,
             s.cancelled_at,
             s.is_extended,
             s.extension_notes,
             s.extension_count,
             s.modification_history
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      JOIN public.cleaners c ON s.cleaner_id = c.id
      WHERE l.user_id = $1
      ORDER BY s.check_out ASC
    `, [userId])
    return result.rows
  },

  async getShareTokens(userId: string) {
    const result = await pool.query(
      `SELECT * FROM public.share_tokens 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    )
    return result.rows
  },

  async getShareToken(token: string) {
    const result = await pool.query(
      `SELECT * FROM public.share_tokens 
       WHERE token = $1 AND is_active = true AND expires_at > NOW()`,
      [token]
    )
    return result.rows[0]
  },

  async createShareToken(userId: string, data: {
    token: string;
    name?: string;
    cleaner_id?: string;
    listing_ids?: string[];
    date_from?: string;
    date_to?: string;
    expires_at: Date;
  }) {
    const result = await pool.query(
      `INSERT INTO public.share_tokens 
       (user_id, token, name, cleaner_id, listing_ids, date_from, date_to, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        userId,
        data.token,
        data.name || null,
        data.cleaner_id || null,
        data.listing_ids || null,
        data.date_from || null,
        data.date_to || null,
        data.expires_at.toISOString()
      ]
    )
    return result.rows[0]
  },

  async updateShareTokenView(tokenId: string) {
    await pool.query(
      `UPDATE public.share_tokens 
       SET view_count = view_count + 1, last_viewed_at = NOW() 
       WHERE id = $1`,
      [tokenId]
    )
  },

  async deleteShareToken(tokenId: string, userId: string) {
    const result = await pool.query(
      `DELETE FROM public.share_tokens 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [tokenId, userId]
    )
    return result.rows[0]
  },

  // Cleaner authentication methods
  async getCleanerByPhone(userId: string, phoneNumber: string) {
    const result = await pool.query(
      'SELECT * FROM public.cleaners WHERE user_id = $1 AND phone = $2',
      [userId, phoneNumber]
    )
    return result.rows[0]
  },

  async getCleanerById(cleanerId: string) {
    const result = await pool.query(
      'SELECT * FROM public.cleaners WHERE id = $1',
      [cleanerId]
    )
    return result.rows[0]
  },

  async getRecentAuthCode(cleanerId: string) {
    const result = await pool.query(
      `SELECT * FROM public.cleaner_auth_codes 
       WHERE cleaner_id = $1 AND created_at > NOW() - INTERVAL '1 minute'
       ORDER BY created_at DESC LIMIT 1`,
      [cleanerId]
    )
    return result.rows[0]
  },

  async createAuthCode(cleanerId: string, phoneNumber: string, code: string, expiresAt: Date) {
    const result = await pool.query(
      `INSERT INTO public.cleaner_auth_codes (cleaner_id, phone_number, code, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [cleanerId, phoneNumber, code, expiresAt]
    )
    return result.rows[0]
  },

  async verifyAuthCode(phoneNumber: string, code: string) {
    const result = await pool.query(
      `SELECT * FROM public.cleaner_auth_codes 
       WHERE phone_number = $1 AND code = $2 AND used_at IS NULL 
       AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phoneNumber, code]
    )
    return result.rows[0]
  },

  async markAuthCodeUsed(codeId: string) {
    await pool.query(
      'UPDATE public.cleaner_auth_codes SET used_at = NOW() WHERE id = $1',
      [codeId]
    )
  },

  async createCleanerSession(cleanerId: string, token: string, deviceInfo: any, expiresAt: Date) {
    const result = await pool.query(
      `INSERT INTO public.cleaner_sessions (cleaner_id, token, device_info, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [cleanerId, token, deviceInfo, expiresAt]
    )
    return result.rows[0]
  },

  async getCleanerSession(token: string) {
    const result = await pool.query(
      `SELECT cs.*, c.name as cleaner_name, c.phone as cleaner_phone
       FROM public.cleaner_sessions cs
       JOIN public.cleaners c ON cs.cleaner_id = c.id
       WHERE cs.token = $1 AND cs.expires_at > NOW()`,
      [token]
    )
    return result.rows[0]
  },

  async updateSessionActivity(sessionId: string) {
    await pool.query(
      'UPDATE public.cleaner_sessions SET last_activity = NOW() WHERE id = $1',
      [sessionId]
    )
  },

  // Cleaner schedule methods
  async getCleanerSchedule(cleanerId: string, dateFrom?: string, dateTo?: string) {
    let query = `
      SELECT s.*, 
             l.name as listing_name, 
             l.timezone as listing_timezone,
             c.name as cleaner_name,
             c.phone as cleaner_phone,
             COALESCE(s.source, 'airbnb') as source,
             s.original_check_in,
             s.original_check_out,
             s.cancelled_at,
             s.is_extended,
             s.extension_notes,
             cf.id as feedback_id,
             cf.cleanliness_rating,
             cf.notes as feedback_notes,
             cf.completed_at
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      JOIN public.cleaners c ON s.cleaner_id = c.id
      LEFT JOIN public.cleaner_feedback cf ON s.id = cf.schedule_item_id
      WHERE s.cleaner_id = $1
    `
    
    const params: any[] = [cleanerId]
    let paramIndex = 2

    if (dateFrom) {
      query += ` AND s.check_out >= $${paramIndex}`
      params.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      query += ` AND s.check_out <= $${paramIndex}`
      params.push(dateTo)
    } else if (!dateFrom) {
      // Default to showing future items only
      query += ` AND s.check_out >= CURRENT_DATE`
    }

    query += ` ORDER BY s.check_out ASC`

    const result = await pool.query(query, params)
    return result.rows
  },

  // Cleaner feedback methods
  async createCleanerFeedback(data: {
    scheduleItemId: string,
    cleanerId: string,
    listingId: string,
    cleanlinessRating?: string,
    notes?: string,
    completedAt?: Date
  }) {
    const result = await pool.query(
      `INSERT INTO public.cleaner_feedback 
       (schedule_item_id, cleaner_id, listing_id, cleanliness_rating, notes, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (schedule_item_id) 
       DO UPDATE SET 
         cleanliness_rating = EXCLUDED.cleanliness_rating,
         notes = EXCLUDED.notes,
         completed_at = EXCLUDED.completed_at,
         updated_at = NOW()
       RETURNING *`,
      [
        data.scheduleItemId,
        data.cleanerId,
        data.listingId,
        data.cleanlinessRating,
        data.notes,
        data.completedAt || new Date()
      ]
    )
    
    // Also mark the schedule item as completed
    await pool.query(
      'UPDATE public.schedule_items SET is_completed = TRUE WHERE id = $1',
      [data.scheduleItemId]
    )
    
    return result.rows[0]
  },

  async getCleanerFeedback(scheduleItemId: string) {
    const result = await pool.query(
      'SELECT * FROM public.cleaner_feedback WHERE schedule_item_id = $1',
      [scheduleItemId]
    )
    return result.rows[0]
  }
}