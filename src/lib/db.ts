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
             COALESCE(s.source, 'airbnb') as source
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      JOIN public.cleaners c ON s.cleaner_id = c.id
      WHERE l.user_id = $1 AND s.check_out >= CURRENT_DATE
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
             COALESCE(s.source, 'airbnb') as source
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      JOIN public.cleaners c ON s.cleaner_id = c.id
      WHERE l.user_id = $1
      ORDER BY s.check_out ASC
    `, [userId])
    return result.rows
  }
}