import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { getSubscriptionInfo } from '@/lib/subscription-edge';
import { handleApiError, ApiResponses } from '@/lib/api-errors';
import { logger } from '@/lib/logger-edge';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }
    
    logger.info('Fetching subscription info for user', { userId: user.id });
    
    const subscriptionInfo = await getSubscriptionInfo(user.id);
    
    if (!subscriptionInfo) {
      logger.error('Unable to load subscription information', { userId: user.id });
      
      // Return a default subscription info instead of throwing
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        daysLeftInTrial: 0,
        features: {
          listings: 1,
          cleaners: 2,
          sms: false,
          whatsapp: false,
          email: true,
          cleanerDashboard: false,
          autoAssignment: false,
          dailyAlerts: false,
          weeklyExport: false,
          analytics: false,
          feedbackReminders: false
        },
        usage: {
          listings: { current: 0, limit: 1 },
          cleaners: { current: 0, limit: 2 }
        },
        trialEndsAt: null
      });
    }
    
    return NextResponse.json(subscriptionInfo);
  } catch (error) {
    logger.error('Subscription API error', error);
    return handleApiError(error, {
      route: '/api/subscription',
      method: 'GET'
    });
  }
}