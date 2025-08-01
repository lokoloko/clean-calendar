import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const supabase = await createClient();
    
    // Test profile fetch
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return NextResponse.json({
        error: 'Profile fetch failed',
        details: profileError
      }, { status: 500 });
    }
    
    // Test listings fetch
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id);
    
    if (listingsError) {
      return NextResponse.json({
        error: 'Listings fetch failed',
        details: listingsError
      }, { status: 500 });
    }
    
    // Test cleaners fetch
    const { data: cleaners, error: cleanersError } = await supabase
      .from('cleaners')
      .select('*')
      .eq('user_id', user.id);
    
    if (cleanersError) {
      return NextResponse.json({
        error: 'Cleaners fetch failed',
        details: cleanersError
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      profile: !!profile,
      listings: listings?.length || 0,
      cleaners: cleaners?.length || 0,
      profileData: profile
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}