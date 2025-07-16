import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'
    
    const schedule = includeHistory 
      ? await db.getAllSchedule(DEV_USER_ID)
      : await db.getSchedule(DEV_USER_ID)
      
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}