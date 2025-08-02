import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    
    // For now, return a simple success response
    // In production, this would regenerate schedule items
    return NextResponse.json({
      success: true,
      message: 'Schedule regeneration is temporarily disabled',
      itemsCreated: 0
    });
  } catch (error) {
    console.error('Regenerate schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate schedule' },
      { status: 500 }
    );
  }
}