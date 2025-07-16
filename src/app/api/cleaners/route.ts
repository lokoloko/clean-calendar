import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const cleaners = await db.getCleaners(DEV_USER_ID)
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
    const body = await request.json()
    const { name, phone, email } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const cleaner = await db.createCleaner(DEV_USER_ID, {
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