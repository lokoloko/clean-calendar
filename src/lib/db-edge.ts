import { createClient } from '@/lib/supabase-server'
import { logger } from './logger-edge'

/**
 * Edge-compatible database client using Supabase instead of pg module
 * This replaces the pg-based db.ts for edge runtime compatibility
 */

export const db = {
  async query(text: string, params?: any[]) {
    const supabase = await createClient()
    
    // For simple SELECT queries, we can use Supabase's from() API
    // For complex queries, we'll need to use RPC or restructure
    logger.warn('Direct SQL query attempted in edge runtime', { query: text.substring(0, 100) })
    
    // This is a compatibility layer - in production, use Supabase methods directly
    throw new Error('Direct SQL queries not supported in edge runtime. Use Supabase client methods.')
  },
  
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    // Supabase doesn't support transactions in the same way
    // This is a simplified version that just runs the callback
    const supabase = await createClient()
    return callback({
      query: async (text: string, params?: any[]) => {
        logger.warn('Transaction query attempted in edge runtime', { query: text.substring(0, 100) })
        throw new Error('Transactions not supported in edge runtime')
      }
    })
  },
  
  async getUser(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      logger.error('Failed to get user', error)
      throw error
    }
    
    return data
  },
  
  async getProfile(userId: string) {
    return this.getUser(userId)
  },
  
  async createProfile(userId: string, email: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, email }, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create profile', error)
      throw error
    }
    
    return data
  },
  
  async createOrUpdateProfile(userId: string, data: {
    email?: string
    name?: string
    avatar_url?: string
  }) {
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        ...data 
      }, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create/update profile', error)
      throw error
    }
    
    return profile
  },
  
  async getListings(userId: string, includeInactive = false) {
    const supabase = await createClient()
    let query = supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (!includeInactive) {
      query = query.eq('is_active_on_airbnb', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      logger.error('Failed to get listings', error)
      throw error
    }
    
    return data || []
  },
  
  async getListing(id: string, userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      logger.error('Failed to get listing', error)
      throw error
    }
    
    return data
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
    const supabase = await createClient()
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        user_id: data.userId,
        name: data.name,
        ics_url: data.icsUrl || null,
        timezone: data.timezone || 'America/Los_Angeles',
        check_in_time: data.checkInTime || '15:00',
        check_out_time: data.checkOutTime || '11:00',
        is_active_on_airbnb: data.isActiveOnAirbnb !== undefined ? data.isActiveOnAirbnb : true
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create listing', error)
      throw error
    }
    
    return listing
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
    const supabase = await createClient()
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.icsUrl !== undefined) updateData.ics_url = data.icsUrl
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.checkInTime !== undefined) updateData.check_in_time = data.checkInTime
    if (data.checkOutTime !== undefined) updateData.check_out_time = data.checkOutTime
    if (data.isActiveOnAirbnb !== undefined) updateData.is_active_on_airbnb = data.isActiveOnAirbnb
    
    if (Object.keys(updateData).length === 0) {
      return null
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { data: listing, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to update listing', error)
      throw error
    }
    
    return listing
  },
  
  async deleteListing(id: string, userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to delete listing', error)
      throw error
    }
    
    return data
  },
  
  async getUserProfile(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to get user profile', error)
      throw error
    }
    
    return data
  },

  async getCleaners(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaners')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      logger.error('Failed to get cleaners', error)
      throw error
    }
    
    return data || []
  },
  
  async getCleaner(id: string, userId?: string) {
    const supabase = await createClient()
    let query = supabase
      .from('cleaners')
      .select('*')
      .eq('id', id)
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query.single()
    
    if (error) {
      logger.error('Failed to get cleaner', error)
      throw error
    }
    
    return data
  },
  
  async createCleaner(data: {
    userId: string
    name: string
    phone?: string
    email?: string
  }) {
    const supabase = await createClient()
    const { data: cleaner, error } = await supabase
      .from('cleaners')
      .insert({
        user_id: data.userId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create cleaner', error)
      throw error
    }
    
    return cleaner
  },
  
  async updateCleaner(
    id: string,
    userId: string,
    data: {
      name?: string
      phone?: string
      email?: string
      sms_opted_in?: boolean
      sms_opted_in_at?: string
      sms_opt_out_at?: string | null
      sms_invite_sent_at?: string
      sms_invite_token?: string
    }
  ) {
    const supabase = await createClient()
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.sms_opted_in !== undefined) updateData.sms_opted_in = data.sms_opted_in
    if (data.sms_opted_in_at !== undefined) updateData.sms_opted_in_at = data.sms_opted_in_at
    if (data.sms_opt_out_at !== undefined) updateData.sms_opt_out_at = data.sms_opt_out_at
    if (data.sms_invite_sent_at !== undefined) updateData.sms_invite_sent_at = data.sms_invite_sent_at
    if (data.sms_invite_token !== undefined) updateData.sms_invite_token = data.sms_invite_token
    
    if (Object.keys(updateData).length === 0) {
      return null
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { data: cleaner, error } = await supabase
      .from('cleaners')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to update cleaner', error)
      throw error
    }
    
    return cleaner
  },
  
  async deleteCleaner(id: string, userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaners')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to delete cleaner', error)
      throw error
    }
    
    return data
  },
  
  async getAssignments(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        listings!inner(name, user_id),
        cleaners!inner(name)
      `)
      .eq('listings.user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      logger.error('Failed to get assignments', error)
      throw error
    }
    
    // Transform data to match expected format
    return (data || []).map((a: any) => ({
      ...a,
      listing_name: a.listings?.name,
      cleaner_name: a.cleaners?.name
    }))
  },
  
  async createAssignment(data: {
    listingId: string
    cleanerId: string
    userId: string
  }) {
    const supabase = await createClient()
    
    // Verify ownership
    const [listingCheck, cleanerCheck] = await Promise.all([
      supabase.from('listings').select('user_id').eq('id', data.listingId).single(),
      supabase.from('cleaners').select('user_id').eq('id', data.cleanerId).single()
    ])
    
    if (listingCheck.error || cleanerCheck.error ||
        listingCheck.data?.user_id !== data.userId || 
        cleanerCheck.data?.user_id !== data.userId) {
      throw new Error('Unauthorized')
    }
    
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        listing_id: data.listingId,
        cleaner_id: data.cleanerId
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create assignment', error)
      throw error
    }
    
    return assignment
  },
  
  async deleteAssignment(id: string, userId: string) {
    const supabase = await createClient()
    
    // First verify ownership
    const { data: assignment } = await supabase
      .from('assignments')
      .select('*, listings!inner(user_id)')
      .eq('id', id)
      .single()
    
    if (!assignment || assignment.listings?.user_id !== userId) {
      throw new Error('Unauthorized')
    }
    
    const { data, error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to delete assignment', error)
      throw error
    }
    
    return data
  },
  
  async getScheduleItems(userId: string, filters?: {
    startDate?: Date
    endDate?: Date
    listingId?: string
    cleanerId?: string
  }) {
    const supabase = await createClient()
    let query = supabase
      .from('schedule_items')
      .select(`
        *,
        listings!inner(name, user_id),
        cleaners!inner(name)
      `)
      .eq('listings.user_id', userId)
    
    if (filters?.startDate) {
      query = query.gte('check_out', filters.startDate.toISOString())
    }
    
    if (filters?.endDate) {
      query = query.lte('check_out', filters.endDate.toISOString())
    }
    
    if (filters?.listingId) {
      query = query.eq('listing_id', filters.listingId)
    }
    
    if (filters?.cleanerId) {
      query = query.eq('cleaner_id', filters.cleanerId)
    }
    
    const { data, error } = await query.order('check_out', { ascending: true })
    
    if (error) {
      logger.error('Failed to get schedule items', error)
      throw error
    }
    
    // Transform data to match expected format
    return (data || []).map((s: any) => ({
      ...s,
      listing_name: s.listings?.name,
      cleaner_name: s.cleaners?.name
    }))
  },
  
  async updateScheduleItem(
    id: string,
    userId: string,
    data: {
      cleanerId?: string
      isCompleted?: boolean
    }
  ) {
    const supabase = await createClient()
    
    // Verify ownership
    const { data: item } = await supabase
      .from('schedule_items')
      .select('*, listings!inner(user_id)')
      .eq('id', id)
      .single()
    
    if (!item || item.listings?.user_id !== userId) {
      throw new Error('Unauthorized')
    }
    
    const updateData: any = {}
    
    if (data.cleanerId !== undefined) updateData.cleaner_id = data.cleanerId
    if (data.isCompleted !== undefined) updateData.is_completed = data.isCompleted
    
    if (Object.keys(updateData).length === 0) {
      return null
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { data: updated, error } = await supabase
      .from('schedule_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to update schedule item', error)
      throw error
    }
    
    return updated
  },
  
  async getCleanerByPhone(userId: string, phoneNumber: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaners')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', phoneNumber)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to get cleaner by phone', error)
      throw error
    }
    
    return data
  },
  
  async getCleanerById(cleanerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaners')
      .select('*')
      .eq('id', cleanerId)
      .single()
    
    if (error) {
      logger.error('Failed to get cleaner by id', error)
      throw error
    }
    
    return data
  },
  
  async getRecentAuthCode(cleanerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaner_auth_codes')
      .select('*')
      .eq('cleaner_id', cleanerId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to get recent auth code', error)
      throw error
    }
    
    return data
  },
  
  async createAuthCode(cleanerId: string, phoneNumber: string, code: string, expiresAt: Date) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaner_auth_codes')
      .insert({
        cleaner_id: cleanerId,
        phone_number: phoneNumber,
        code,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create auth code', error)
      throw error
    }
    
    return data
  },
  
  async verifyAuthCode(phoneNumber: string, code: string) {
    const supabase = await createClient()
    
    // First find the code
    const { data: authCode } = await supabase
      .from('cleaner_auth_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (!authCode) {
      return null
    }
    
    // Mark it as used
    const { data, error } = await supabase
      .from('cleaner_auth_codes')
      .update({ used: true })
      .eq('id', authCode.id)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to verify auth code', error)
      throw error
    }
    
    return data
  },
  
  async createCleanerSession(cleanerId: string, token: string, deviceInfo: any, expiresAt: Date) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaner_sessions')
      .insert({
        cleaner_id: cleanerId,
        token: token,
        device_info: deviceInfo,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create cleaner session', error)
      throw error
    }
    
    return data
  },
  
  async getCleanerSession(token: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaner_sessions')
      .select(`
        *,
        cleaners!inner(*)
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to get cleaner session', error)
      throw error
    }
    
    if (!data) return null
    
    // Flatten the response to match expected format
    return {
      ...data,
      ...data.cleaners
    }
  },
  
  async updateSessionActivity(sessionId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaner_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to update session activity', error)
      throw error
    }
    
    return data
  },
  
  async getCleanersByPhone(phone: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaners')
      .select('*')
      .eq('phone', phone)
    
    if (error) {
      logger.error('Failed to get cleaners by phone', error)
      throw error
    }
    
    return data || []
  },
  
  async getCleanerSchedule(cleanerId: string, fromDate?: Date, toDate?: Date) {
    const supabase = await createClient()
    let query = supabase
      .from('schedule_items')
      .select(`
        *,
        listings!inner(
          name,
          timezone,
          check_in_time,
          check_out_time
        ),
        cleaner_feedback(
          id,
          cleanliness_rating,
          notes,
          completed_at
        )
      `)
      .eq('cleaner_id', cleanerId)
    
    if (fromDate) {
      query = query.gte('check_out', fromDate.toISOString())
    }
    
    if (toDate) {
      query = query.lte('check_out', toDate.toISOString())
    }
    
    const { data, error } = await query.order('check_out', { ascending: true })
    
    if (error) {
      logger.error('Failed to get cleaner schedule', error)
      throw error
    }
    
    // Transform data to match expected format
    return (data || []).map((s: any) => ({
      ...s,
      listing_name: s.listings?.name,
      listing_timezone: s.listings?.timezone,
      check_in_time: s.listings?.check_in_time,
      check_out_time: s.listings?.check_out_time,
      feedback_id: s.cleaner_feedback?.[0]?.id,
      cleanliness_rating: s.cleaner_feedback?.[0]?.cleanliness_rating,
      feedback_notes: s.cleaner_feedback?.[0]?.notes,
      feedback_completed_at: s.cleaner_feedback?.[0]?.completed_at
    }))
  },
  
  async createCleanerFeedback(data: {
    scheduleItemId: string
    cleanerId: string
    listingId: string
    cleanlinessRating: 'clean' | 'normal' | 'dirty'
    notes?: string
    completedAt: Date
  }) {
    const supabase = await createClient()
    
    // Check if feedback already exists
    const { data: existing } = await supabase
      .from('cleaner_feedback')
      .select('id')
      .eq('schedule_item_id', data.scheduleItemId)
      .single()
    
    if (existing) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('cleaner_feedback')
        .update({
          cleanliness_rating: data.cleanlinessRating,
          notes: data.notes || null,
          completed_at: data.completedAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) {
        logger.error('Failed to update cleaner feedback', error)
        throw error
      }
      
      return updated
    } else {
      // Create new
      const { data: created, error } = await supabase
        .from('cleaner_feedback')
        .insert({
          schedule_item_id: data.scheduleItemId,
          cleaner_id: data.cleanerId,
          listing_id: data.listingId,
          cleanliness_rating: data.cleanlinessRating,
          notes: data.notes || null,
          completed_at: data.completedAt.toISOString()
        })
        .select()
        .single()
      
      if (error) {
        logger.error('Failed to create cleaner feedback', error)
        throw error
      }
      
      return created
    }
  },
  
  async createShareToken(userId: string, data: {
    token: string
    expiresAt: Date
    shareType: 'schedule' | 'specific'
    shareData?: any
  }) {
    const supabase = await createClient()
    const { data: shareToken, error } = await supabase
      .from('share_tokens')
      .insert({
        user_id: userId,
        token: data.token,
        expires_at: data.expiresAt.toISOString(),
        share_type: data.shareType,
        share_data: data.shareData || null
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create share token', error)
      throw error
    }
    
    return shareToken
  },
  
  async updateShareTokenView(tokenId: string) {
    const supabase = await createClient()
    
    // First get current view count
    const { data: current } = await supabase
      .from('share_tokens')
      .select('view_count')
      .eq('id', tokenId)
      .single()
    
    const { data, error } = await supabase
      .from('share_tokens')
      .update({
        view_count: (current?.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq('id', tokenId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to update share token view', error)
      throw error
    }
    
    return data
  },
  
  async getSchedule(userId: string) {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data, error } = await supabase
      .from('schedule_items')
      .select(`
        *,
        listings!inner(name, timezone, user_id),
        cleaners!inner(name, phone),
        cleaner_feedback(
          id,
          cleanliness_rating,
          notes
        ),
        manual_schedule_rules(
          frequency
        )
      `)
      .eq('listings.user_id', userId)
      .gte('check_out', thirtyDaysAgo.toISOString())
      .order('check_out', { ascending: true })
    
    if (error) {
      logger.error('Failed to get schedule', error)
      throw error
    }
    
    // Transform data to match expected format
    return (data || []).map((s: any) => ({
      ...s,
      listing_name: s.listings?.name,
      listing_timezone: s.listings?.timezone,
      cleaner_name: s.cleaners?.name,
      cleaner_phone: s.cleaners?.phone,
      feedback_id: s.cleaner_feedback?.[0]?.id,
      cleanliness_rating: s.cleaner_feedback?.[0]?.cleanliness_rating,
      feedback_notes: s.cleaner_feedback?.[0]?.notes,
      manual_rule_frequency: s.manual_schedule_rules?.frequency
    }))
  },
  
  async getAllSchedule(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('schedule_items')
      .select(`
        *,
        listings!inner(name, timezone, user_id),
        cleaners!inner(name, phone),
        cleaner_feedback(
          id,
          cleanliness_rating,
          notes
        ),
        manual_schedule_rules(
          frequency
        )
      `)
      .eq('listings.user_id', userId)
      .order('check_out', { ascending: false })
    
    if (error) {
      logger.error('Failed to get all schedule', error)
      throw error
    }
    
    // Transform data to match expected format
    return (data || []).map((s: any) => ({
      ...s,
      listing_name: s.listings?.name,
      listing_timezone: s.listings?.timezone,
      cleaner_name: s.cleaners?.name,
      cleaner_phone: s.cleaners?.phone,
      feedback_id: s.cleaner_feedback?.[0]?.id,
      cleanliness_rating: s.cleaner_feedback?.[0]?.cleanliness_rating,
      feedback_notes: s.cleaner_feedback?.[0]?.notes,
      manual_rule_frequency: s.manual_schedule_rules?.frequency
    }))
  },
  
  async getShareTokens(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      logger.error('Failed to get share tokens', error)
      throw error
    }
    
    return data || []
  },
  
  async deleteShareToken(tokenId: string, userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('share_tokens')
      .delete()
      .eq('id', tokenId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to delete share token', error)
      throw error
    }
    
    return data
  },
  
  async getShareToken(token: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('share_tokens')
      .select(`
        *,
        profiles!inner(email)
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to get share token', error)
      throw error
    }
    
    if (!data) return null
    
    // Transform data to match expected format
    return {
      ...data,
      user_email: data.profiles?.email
    }
  },
  
  async checkHealth() {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) throw error
      
      return { healthy: true, timestamp: new Date().toISOString() }
    } catch (error) {
      logger.error('Database health check failed', error)
      return { healthy: false, error }
    }
  },
  
  async createCleanerShareToken(cleanerId: string, token: string) {
    const supabase = await createClient()
    
    // First check if a share token already exists for this cleaner
    const { data: existing } = await supabase
      .from('cleaner_sessions')
      .select('*')
      .eq('cleaner_id', cleanerId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (existing) {
      // Return existing token
      return existing
    }
    
    // Create new token
    const { data, error } = await supabase
      .from('cleaner_sessions')
      .insert({
        cleaner_id: cleanerId,
        token: token,
        expires_at: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 10 years
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logger.error('Failed to create cleaner share token', error)
      throw error
    }
    
    return data
  },

  async getCleanerByShareToken(token: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cleaner_sessions')
      .select(`
        *,
        cleaner:cleaners(*)
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      logger.error('Failed to get cleaner by share token', error)
      throw error
    }
    
    return data?.cleaner ? { ...data.cleaner, token: token, expires_at: data.expires_at } : null
  },

  async getCleanerScheduleAllHosts(cleanerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('schedule_items')
      .select(`
        *,
        listing:listings!inner(
          id,
          name,
          address,
          user_id,
          user:profiles!listings_user_id_fkey(email)
        ),
        cleaner:cleaners!inner(
          id,
          name
        ),
        feedback:cleaner_feedback(
          id,
          completed_at,
          cleanliness_rating,
          notes
        )
      `)
      .eq('cleaner_id', cleanerId)
      .neq('status', 'cancelled')
      .order('check_out', { ascending: true })
    
    if (error) {
      logger.error('Failed to get cleaner schedule across all hosts', error)
      throw error
    }
    
    return (data || []).map((item: any) => ({
      ...item,
      listing_name: item.listing?.name,
      listing_address: item.listing?.address,
      cleaner_name: item.cleaner?.name,
      host_email: item.listing?.user?.email,
      feedback_completed_at: item.feedback?.[0]?.completed_at,
      cleanliness_rating: item.feedback?.[0]?.cleanliness_rating,
      feedback_notes: item.feedback?.[0]?.notes,
      is_completed: !!item.feedback?.[0]?.id
    }))
  },

  async close() {
    // No-op for Supabase client
    logger.info('Database close called (no-op for Supabase)')
  }
}