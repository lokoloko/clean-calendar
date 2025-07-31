import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { getSubscriptionInfo } from '@/lib/subscription';
import { handleApiError, ApiResponses } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw ApiResponses.unauthorized();
    }
    
    const subscriptionInfo = await getSubscriptionInfo(user.id);
    
    if (!subscriptionInfo) {
      logger.error('Unable to load subscription information', { userId: user.id });
      throw ApiResponses.internalError('Unable to load subscription information');
    }
    
    return NextResponse.json(subscriptionInfo);
  } catch (error) {
    return handleApiError(error, {
      route: '/api/subscription',
      method: 'GET'
    });
  }
}