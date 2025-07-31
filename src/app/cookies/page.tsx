'use client';

import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CookiesPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: January 30, 2025</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What Are Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cookies are small text files stored on your device when you visit our website. 
              They help us provide a better user experience by remembering your preferences and login status.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Essential Cookies</h3>
              <p className="text-sm text-muted-foreground">
                Required for the Service to function properly:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4 mt-2">
                <li><strong>Authentication:</strong> Keeps you logged in</li>
                <li><strong>Security:</strong> Protects against unauthorized access</li>
                <li><strong>Session Management:</strong> Maintains your session state</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Functional Cookies</h3>
              <p className="text-sm text-muted-foreground">
                Enhance your experience:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4 mt-2">
                <li><strong>Preferences:</strong> Remember your settings</li>
                <li><strong>Language:</strong> Store your language choice</li>
                <li><strong>UI State:</strong> Remember sidebar and view preferences</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Analytics Cookies</h3>
              <p className="text-sm text-muted-foreground">
                Help us understand how you use our Service:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4 mt-2">
                <li><strong>Usage Patterns:</strong> Track feature usage</li>
                <li><strong>Performance:</strong> Monitor page load times</li>
                <li><strong>Errors:</strong> Identify and fix issues</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              We use services that may set their own cookies:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Google:</strong> For authentication via Google Sign-In</li>
              <li><strong>Vercel Analytics:</strong> For performance monitoring</li>
              <li><strong>Stripe:</strong> For payment processing (when implemented)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Managing Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Block all cookies (may affect functionality)</li>
              <li>Delete existing cookies</li>
              <li>Allow cookies from specific sites only</li>
              <li>Receive notifications when cookies are set</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              Note: Disabling essential cookies may prevent you from using certain features of our Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Updates to This Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We may update this Cookie Policy from time to time. Changes will be posted on this page 
              with an updated revision date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you have questions about our use of cookies:
            </p>
            <p className="text-sm font-medium mt-3">
              Email: privacy@cleansweep.app<br />
              Address: [Your Business Address]
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}