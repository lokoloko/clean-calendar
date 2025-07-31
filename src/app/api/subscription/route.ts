import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { getSubscriptionInfo } from '@/lib/subscription';

export async function GET() {
  try {
    const user = await requireAuth();
    const subscriptionInfo = await getSubscriptionInfo(user.id);
    
    if (!subscriptionInfo) {
      return NextResponse.json(
        { error: 'Unable to load subscription information' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(subscriptionInfo);
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription info' },
      { status: 500 }
    );
  }
}