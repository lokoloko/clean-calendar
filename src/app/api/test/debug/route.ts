import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db-edge';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Test each API
    const results = {
      user: { id: user.id, email: user.email },
      tests: {
        cleaners: null as any,
        listings: null as any,
        assignments: null as any,
        subscription: null as any
      }
    };
    
    // Test cleaners
    try {
      const cleaners = await db.getCleaners(user.id);
      results.tests.cleaners = { success: true, count: cleaners.length };
    } catch (error) {
      results.tests.cleaners = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test listings
    try {
      const listings = await db.getListings(user.id);
      results.tests.listings = { success: true, count: listings.length };
    } catch (error) {
      results.tests.listings = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test assignments
    try {
      const assignments = await db.getAssignments(user.id);
      results.tests.assignments = { success: true, count: assignments.length };
    } catch (error) {
      results.tests.assignments = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test subscription
    try {
      const { getSubscriptionInfo } = await import('@/lib/subscription-edge');
      const subInfo = await getSubscriptionInfo(user.id);
      results.tests.subscription = { success: true, tier: subInfo?.tier || 'unknown' };
    } catch (error) {
      results.tests.subscription = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}