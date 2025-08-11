'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import Link from 'next/link';

const TIER_ICONS = {
  free: null,
  starter: Sparkles,
  pro: Crown
};

const TIER_COLORS = {
  free: 'secondary',
  starter: 'default',
  pro: 'default'
} as const;

const formatTierName = (tier: string): string => {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};

export default function BillingPage() {
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
      if (!response.ok) {
        throw new Error('Failed to fetch subscription info');
      }
      const info = await response.json();
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!subscriptionInfo) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Unable to load subscription information</div>
        </div>
      </AppLayout>
    );
  }

  const { tier, status, daysLeftInTrial, features, usage } = subscriptionInfo;
  const Icon = TIER_ICONS[tier as keyof typeof TIER_ICONS];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5" />}
                  {formatTierName(tier)} Plan
                </CardTitle>
                <CardDescription>
                  {status === 'trial' 
                    ? `${daysLeftInTrial} days left in your free trial`
                    : `Your current subscription plan`
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={TIER_COLORS[tier as keyof typeof TIER_COLORS]}>
                  {status === 'trial' ? 'Trial' : formatTierName(tier)}
                </Badge>
                {tier !== 'pro' && (
                  <Button asChild>
                    <Link href="/billing/upgrade">Upgrade</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Usage */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Listings</CardTitle>
              <CardDescription>
                {usage.listings.current} of {usage.listings.limit === 999 ? 'Unlimited' : usage.listings.limit}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usage.listings.limit !== 999 && (
                <Progress 
                  value={(usage.listings.current / usage.listings.limit) * 100} 
                  className="mb-2"
                />
              )}
              <p className="text-sm text-muted-foreground">
                {usage.listings.limit === 999 
                  ? 'Create unlimited property listings'
                  : `${usage.listings.limit - usage.listings.current} listings remaining`
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cleaners</CardTitle>
              <CardDescription>
                {usage.cleaners.current} of {usage.cleaners.limit === 999 ? 'Unlimited' : usage.cleaners.limit}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usage.cleaners.limit !== 999 && (
                <Progress 
                  value={(usage.cleaners.current / usage.cleaners.limit) * 100} 
                  className="mb-2"
                />
              )}
              <p className="text-sm text-muted-foreground">
                {usage.cleaners.limit === 999 
                  ? 'Add unlimited team members'
                  : `${usage.cleaners.limit - usage.cleaners.current} cleaners remaining`
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
            <CardDescription>Features included in your {formatTierName(tier)} plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium mb-2">Communication</h4>
                <FeatureItem enabled={features.email} label="Email notifications" />
                <FeatureItem enabled={features.sms} label="SMS notifications" />
                <FeatureItem enabled={features.whatsapp} label="WhatsApp messages" />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium mb-2">Features</h4>
                <FeatureItem enabled={features.weeklyExport} label="Weekly schedule export" />
                <FeatureItem enabled={features.cleanerDashboard} label="Cleaner portal access" />
                <FeatureItem enabled={features.autoAssignment} label="Smart auto-assignment" />
                <FeatureItem enabled={features.analytics} label="Advanced analytics" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method - Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">Payment processing coming soon!</p>
              <p className="text-sm">
                You&apos;re currently on a free trial. Add a payment method before your trial ends to continue using GoStudioM.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function FeatureItem({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <div className="h-4 w-4 rounded-full bg-muted" />
      )}
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}