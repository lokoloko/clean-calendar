import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    
    // Get user settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching settings:', error);
      throw error;
    }
    
    // Return settings or defaults
    return NextResponse.json(settings || {
      user_id: user.id,
      sync_enabled: true,
      notification_email: user.email,
      notification_time: '08:00',
      timezone: 'America/Los_Angeles'
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const supabase = await createClient();
    
    // Upsert settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}