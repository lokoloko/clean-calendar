'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M9 11L11 13L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
              <circle cx="18" cy="6" r="3" fill="currentColor" className="text-orange-500"/>
            </svg>
            <span className="font-headline text-lg font-semibold">GoStudioM</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Back to App</Button>
          </Link>
        </div>
      </header>
      
      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">Last updated: January 30, 2025</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              By accessing and using GoStudioM (&quot;Service&quot;), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              GoStudioM provides automated cleaning schedule management for short-term rental properties. Our services include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Calendar synchronization with Airbnb and other platforms</li>
              <li>Cleaner assignment and management</li>
              <li>Schedule notifications via email and SMS</li>
              <li>Reporting and analytics features</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Account Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">To use our Service, you must:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old</li>
              <li>Notify us of any unauthorized access</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Subscription Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Free Trial</h3>
              <p className="text-sm text-muted-foreground">
                All new users receive a 30-day free trial with Starter plan features.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Subscription Tiers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong>Free:</strong> 1 listing, 2 cleaners, email notifications only</li>
                <li><strong>Starter ($9/month):</strong> 3 listings, 5 cleaners, SMS notifications</li>
                <li><strong>Pro ($29/month):</strong> Unlimited listings and cleaners, all features</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Billing</h3>
              <p className="text-sm text-muted-foreground">
                Subscriptions are billed monthly in advance. You can cancel anytime, and your access continues until the end of the billing period.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Use the Service for any illegal purpose</li>
              <li>Share your account with others</li>
              <li>Attempt to bypass subscription limits</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Collect data from other users</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your use of our Service is also governed by our Privacy Policy. By using GoStudioM, 
              you consent to our collection and use of your data as described in the Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All content, features, and functionality of GoStudioM are owned by us and are protected by 
              international copyright, trademark, and other intellectual property laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              GoStudioM is provided &quot;as is&quot; without warranties of any kind. We are not liable for any 
              indirect, incidental, special, or consequential damages arising from your use of the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We reserve the right to terminate or suspend your account for violation of these terms. 
              You may cancel your account at any time through your account settings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We may update these terms from time to time. We will notify you of significant changes 
              via email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For questions about these Terms of Service:
            </p>
            <p className="text-sm font-medium mt-3">
              Email: legal@cleansweep.app<br />
              Address: [Your Business Address]
            </p>
          </CardContent>
        </Card>

        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-muted-foreground">
            By using GoStudioM, you acknowledge that you have read and agree to these Terms of Service.
          </p>
        </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">&copy; 2025 GoStudioM. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Link href="/terms">
              <Button variant="ghost" size="sm">Terms</Button>
            </Link>
            <Link href="/privacy">
              <Button variant="ghost" size="sm">Privacy</Button>
            </Link>
            <Link href="/cookies">
              <Button variant="ghost" size="sm">Cookies</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}