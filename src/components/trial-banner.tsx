'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function TrialBanner() {
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionInfo();
    }
  }, [user]);

  const loadSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const info = await response.json();
        setSubscriptionInfo(info);
      }
    } catch (error) {
      console.error('Error loading subscription info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !subscriptionInfo) {
    return null;
  }

  // Don't show banner if not in trial
  if (subscriptionInfo.status !== 'trial') {
    return null;
  }

  const { daysLeftInTrial } = subscriptionInfo;
  const isExpiringSoon = daysLeftInTrial <= 7;
  const variant = isExpiringSoon ? 'destructive' : 'default';
  const Icon = isExpiringSoon ? AlertCircle : Sparkles;

  return (
    <Alert variant={variant} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>
        {isExpiringSoon ? 'Trial Ending Soon!' : 'Starter Trial'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {daysLeftInTrial > 0 
            ? `${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'} left in your free trial`
            : 'Your trial has expired'
          }. Enjoying all Starter features.
        </span>
        <Button asChild size="sm" variant={isExpiringSoon ? 'default' : 'outline'}>
          <Link href="/billing">
            {isExpiringSoon ? 'Upgrade Now' : 'View Plans'}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}