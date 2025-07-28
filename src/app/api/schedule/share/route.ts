import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import type { CreateShareRequest, ShareToken } from '@/types/share'
import { requireAuth } from '@/lib/auth-server'

// POST: Create a new share token
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body: CreateShareRequest = await request.json()
    
    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Calculate expiration date (default 30 days)
    const expiresInDays = body.expiresInDays || 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    
    // Validate date range if provided
    if (body.dateFrom && body.dateTo) {
      const dateFrom = new Date(body.dateFrom)
      const dateTo = new Date(body.dateTo)
      if (dateFrom > dateTo) {
        return NextResponse.json(
          { error: 'Invalid date range: dateFrom must be before dateTo' },
          { status: 400 }
        )
      }
    }
    
    // Create the share token
    const shareToken = await db.createShareToken(user.id, {
      token,
      name: body.name,
      cleaner_id: body.cleanerId,
      listing_ids: body.listingIds,
      date_from: body.dateFrom,
      date_to: body.dateTo,
      expires_at: expiresAt
    })
    
    // Construct the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 9002}`
    const shareUrl = `${baseUrl}/share/${token}`
    
    return NextResponse.json({
      id: shareToken.id,
      token: shareToken.token,
      shareUrl,
      name: shareToken.name,
      cleanerId: shareToken.cleaner_id,
      listingIds: shareToken.listing_ids,
      dateFrom: shareToken.date_from,
      dateTo: shareToken.date_to,
      expiresAt: shareToken.expires_at,
      createdAt: shareToken.created_at
    })
  } catch (error) {
    console.error('Error creating share token:', error)
    return NextResponse.json(
      { error: 'Failed to create share token' },
      { status: 500 }
    )
  }
}

// GET: Validate and retrieve schedule data for a given token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }
    
    // Get the share token
    const shareToken = await db.getShareToken(token)
    
    if (!shareToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }
    
    // Update view count and last viewed timestamp
    await db.updateShareTokenView(shareToken.id)
    
    // Build the schedule query with filters
    let scheduleQuery = `
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
    `
    
    const queryParams: any[] = [shareToken.user_id]
    let paramIndex = 2
    
    // Apply cleaner filter if specified
    if (shareToken.cleaner_id) {
      scheduleQuery += ` AND s.cleaner_id = $${paramIndex}`
      queryParams.push(shareToken.cleaner_id)
      paramIndex++
    }
    
    // Apply listing filter if specified
    if (shareToken.listing_ids && shareToken.listing_ids.length > 0) {
      scheduleQuery += ` AND s.listing_id = ANY($${paramIndex})`
      queryParams.push(shareToken.listing_ids)
      paramIndex++
    }
    
    // Apply date range filter if specified
    if (shareToken.date_from) {
      scheduleQuery += ` AND s.check_out >= $${paramIndex}`
      queryParams.push(shareToken.date_from)
      paramIndex++
    }
    
    if (shareToken.date_to) {
      scheduleQuery += ` AND s.check_out <= $${paramIndex}`
      queryParams.push(shareToken.date_to)
      paramIndex++
    } else {
      // If no date_to is specified, default to showing future items only
      scheduleQuery += ` AND s.check_out >= CURRENT_DATE`
    }
    
    scheduleQuery += ` ORDER BY s.check_out ASC`
    
    const scheduleResult = await db.query(scheduleQuery, queryParams)
    
    // Get cleaners and listings info for the shared view
    const cleanersQuery = shareToken.cleaner_id 
      ? `SELECT * FROM public.cleaners WHERE id = $1`
      : `SELECT * FROM public.cleaners WHERE user_id = $1 ORDER BY name`
    
    const cleanersParams = shareToken.cleaner_id 
      ? [shareToken.cleaner_id]
      : [shareToken.user_id]
    
    const cleanersResult = await db.query(cleanersQuery, cleanersParams)
    
    const listingsQuery = shareToken.listing_ids && shareToken.listing_ids.length > 0
      ? `SELECT * FROM public.listings WHERE id = ANY($1) ORDER BY name`
      : `SELECT * FROM public.listings WHERE user_id = $1 ORDER BY name`
    
    const listingsParams = shareToken.listing_ids && shareToken.listing_ids.length > 0
      ? [shareToken.listing_ids]
      : [shareToken.user_id]
    
    const listingsResult = await db.query(listingsQuery, listingsParams)
    
    return NextResponse.json({
      shareInfo: {
        name: shareToken.name,
        cleanerId: shareToken.cleaner_id,
        listingIds: shareToken.listing_ids,
        dateFrom: shareToken.date_from,
        dateTo: shareToken.date_to,
        expiresAt: shareToken.expires_at
      },
      schedule: scheduleResult.rows,
      cleaners: cleanersResult.rows,
      listings: listingsResult.rows
    })
  } catch (error) {
    console.error('Error retrieving shared schedule:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve shared schedule' },
      { status: 500 }
    )
  }
}