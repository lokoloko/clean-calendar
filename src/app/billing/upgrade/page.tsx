'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    features: [
      '1 Airbnb listing',
      'Email notifications only',
      'Basic cleaning schedule',
      'Manual export',
      'Community support'
    ],
    notIncluded: [
      'SMS notifications',
      'Weekly schedule export',
      'Cleaner portal',
      'Auto-assignment'
    ],
    cta: 'Downgrade to Free',
    variant: 'outline' as const,
    popular: false
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$9',
    description: 'Great for small property managers',
    features: [
      'Up to 3 listings',
      'Email + SMS notifications',
      'Cleaner assignment',
      'Weekly schedule export',
      'Feedback reminders',
      'Email support'
    ],
    notIncluded: [
      'WhatsApp messages',
      'Cleaner portal',
      'Auto-assignment',
      'Advanced analytics'
    ],
    cta: 'Choose Starter',
    variant: 'default' as const,
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    description: 'For professional property managers',
    features: [
      'Unlimited listings',
      'All notification channels',
      'Cleaner portal access',
      'Smart auto-assignment',
      'Advanced analytics',
      'Priority support',
      'API access (coming soon)',
      'Custom integrations'
    ],
    notIncluded: [],
    cta: 'Upgrade to Pro',
    variant: 'default' as const,
    popular: false,
    icon: Crown
  }
];

export default function UpgradePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    
    // Show coming soon message
    toast({
      title: 'Payment processing coming soon!',
      description: `You selected the ${planId} plan. Payment integration will be available shortly.`,
    });

    // For now, just redirect back to billing
    setTimeout(() => {
      router.push('/billing');
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">
            Select the plan that best fits your needs
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">
                    {plan.icon && <plan.icon className="inline h-5 w-5 mr-2" />}
                    {plan.name}
                  </CardTitle>
                  {plan.id === 'starter' && <Sparkles className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {plan.notIncluded.length > 0 && (
                    <>
                      <div className="border-t pt-3 space-y-2">
                        {plan.notIncluded.map((feature) => (
                          <div key={feature} className="flex items-start gap-2">
                            <div className="h-4 w-4 rounded-full bg-muted mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground line-through">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.variant}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectedPlan === plan.id}
                >
                  {selectedPlan === plan.id ? 'Processing...' : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>All plans include a 30-day free trial. No credit card required to start.</p>
          <p className="mt-2">
            Questions? <a href="mailto:support@cleansweep.app" className="underline">Contact support</a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}