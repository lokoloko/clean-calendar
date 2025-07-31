import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { canCreateCleaner } from '@/lib/subscription'

export async function GET() {
  try {
    const user = await requireAuth()
    const cleaners = await db.getCleaners(user.id)
    return NextResponse.json(cleaners)
  } catch (error) {
    console.error('Error fetching cleaners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cleaners' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    
    // Check if user can create more cleaners
    const canCreate = await canCreateCleaner(user.id)
    if (!canCreate.allowed) {
      return NextResponse.json(
        { 
          error: canCreate.reason,
          limit: canCreate.limit,
          current: canCreate.current,
          upgradeUrl: '/billing/upgrade?feature=cleaners'
        },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { name, phone, email } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const cleaner = await db.createCleaner(user.id, {
      name,
      phone,
      email
    })

    return NextResponse.json(cleaner)
  } catch (error) {
    console.error('Error creating cleaner:', error)
    return NextResponse.json(
      { error: 'Failed to create cleaner' },
      { status: 500 }
    )
  }
}