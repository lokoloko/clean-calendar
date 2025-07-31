# Billing Implementation Guide

## Overview

This document outlines the implementation plan for CleanSweep's billing system using Stripe. The system supports 4 subscription tiers with both monthly and annual billing options.

## Subscription Tiers

### Tier Structure
```typescript
enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

interface TierConfig {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  listings: number | 'unlimited';
  features: string[];
}
```

### Pricing Configuration
```typescript
const TIERS: Record<SubscriptionTier, TierConfig> = {
  [SubscriptionTier.FREE]: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    listings: 1,
    features: ['view_bookings', 'export_schedules']
  },
  [SubscriptionTier.STARTER]: {
    name: 'Starter',
    monthlyPrice: 9,
    annualPrice: 86, // 20% discount
    stripePriceIdMonthly: 'price_starter_monthly',
    stripePriceIdAnnual: 'price_starter_annual',
    listings: 3,
    features: ['email_notifications', 'basic_cleaner_calendar']
  },
  [SubscriptionTier.PRO]: {
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 278, // 20% discount
    stripePriceIdMonthly: 'price_pro_monthly',
    stripePriceIdAnnual: 'price_pro_annual',
    listings: 10,
    features: ['sms_notifications', 'full_cleaner_portal', 'analytics']
  },
  [SubscriptionTier.ENTERPRISE]: {
    name: 'Enterprise',
    monthlyPrice: 49,
    annualPrice: 470, // 20% discount
    stripePriceIdMonthly: 'price_enterprise_monthly',
    stripePriceIdAnnual: 'price_enterprise_annual',
    listings: 'unlimited',
    features: ['whatsapp_notifications', 'priority_support', 'api_access']
  }
};
```

## Database Schema Updates

### User Subscription Table
```sql
-- Already exists in migration 009_security_and_subscriptions.sql
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Stripe Integration

### 1. Environment Variables
```env
# Production
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Development
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### 2. Stripe Product Setup

Create products and prices in Stripe Dashboard:

#### Products
1. **CleanSweep Starter**
   - Monthly: $9.00
   - Annual: $86.00 (billed yearly)

2. **CleanSweep Pro**
   - Monthly: $29.00
   - Annual: $278.00 (billed yearly)

3. **CleanSweep Enterprise**
   - Monthly: $49.00
   - Annual: $470.00 (billed yearly)

### 3. API Endpoints

#### Create Checkout Session
```typescript
// POST /api/checkout
export async function POST(request: Request) {
  const { tier, billingInterval } = await request.json();
  const user = await getUser();
  
  // Get or create Stripe customer
  const customer = await getOrCreateStripeCustomer(user);
  
  // Get price ID based on tier and interval
  const priceId = TIERS[tier][`stripePriceId${billingInterval === 'year' ? 'Annual' : 'Monthly'}`];
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    subscription_data: {
      trial_period_days: tier !== 'free' ? 21 : undefined,
      metadata: {
        userId: user.id,
        tier,
      },
    },
  });
  
  return NextResponse.json({ url: session.url });
}
```

#### Manage Subscription
```typescript
// POST /api/billing/manage
export async function POST(request: Request) {
  const user = await getUser();
  const subscription = await getUserSubscription(user.id);
  
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });
  
  return NextResponse.json({ url: session.url });
}
```

### 4. Webhook Handler
```typescript
// POST /api/webhooks/stripe
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook Error', { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
  
  return new Response('OK', { status: 200 });
}
```

## Feature Gating

### Check Feature Access
```typescript
export function hasFeatureAccess(
  userTier: SubscriptionTier,
  feature: string
): boolean {
  const tier = TIERS[userTier];
  return tier.features.includes(feature);
}

// Usage in API routes
if (!hasFeatureAccess(user.tier, 'sms_notifications')) {
  return new Response('Upgrade to Pro for SMS notifications', { status: 403 });
}
```

### Check Listing Limits
```typescript
export async function canAddListing(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  const tier = TIERS[subscription.tier as SubscriptionTier];
  
  if (tier.listings === 'unlimited') return true;
  
  const currentListings = await getListingCount(userId);
  return currentListings < tier.listings;
}
```

## Trial Management

### Trial Period Rules
- 21 days for all paid tiers (Starter, Pro, Enterprise)
- No credit card required during trial
- Email reminders at day 7, 14, and 20
- Auto-downgrade to Free tier when trial ends without payment

### Trial Status Check
```typescript
export function getTrialStatus(subscription: UserSubscription) {
  if (!subscription.trial_end) return null;
  
  const now = new Date();
  const trialEnd = new Date(subscription.trial_end);
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    isActive: now < trialEnd,
    daysLeft,
    endsAt: trialEnd,
  };
}
```

## UI Implementation

### Billing Page Components
```typescript
// src/app/billing/page.tsx
export default function BillingPage() {
  const { subscription, isLoading } = useSubscription();
  
  return (
    <div>
      <CurrentPlan subscription={subscription} />
      <PlanSelector 
        currentTier={subscription.tier}
        onUpgrade={handleUpgrade}
      />
      <BillingHistory customerId={subscription.stripe_customer_id} />
    </div>
  );
}
```

### Upgrade Flow
1. User selects new plan and billing interval
2. Create Stripe checkout session
3. Redirect to Stripe checkout
4. Handle success/cancel callbacks
5. Update subscription via webhook

## Testing

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Test Scenarios
1. New user signup → Free tier
2. Free → Starter upgrade (with trial)
3. Monthly → Annual switch
4. Subscription cancellation
5. Payment failure handling
6. Trial expiration

## Monitoring

### Key Metrics
- MRR (Monthly Recurring Revenue)
- Churn rate
- Trial conversion rate
- Failed payment rate
- Average revenue per user (ARPU)

### Alerts
- Failed payments
- High churn rate
- Subscription errors
- Webhook failures

## Security Considerations

1. **PCI Compliance**: Never store card details; use Stripe tokens
2. **Webhook Security**: Verify Stripe signatures
3. **Rate Limiting**: Limit checkout session creation
4. **Idempotency**: Handle duplicate webhook events
5. **Audit Trail**: Log all subscription changes

## Launch Checklist

- [ ] Create Stripe products and prices
- [ ] Set up webhook endpoint in Stripe
- [ ] Configure environment variables
- [ ] Test all subscription flows
- [ ] Set up monitoring and alerts
- [ ] Create customer support docs
- [ ] Plan migration for existing users