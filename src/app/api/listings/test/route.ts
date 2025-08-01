import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    console.log('Test listings endpoint called');
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const supabase = await createClient();
    
    // Direct Supabase query
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      count: listings?.length || 0,
      listings: listings || []
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}