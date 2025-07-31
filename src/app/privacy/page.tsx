'use client';

import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: January 30, 2025</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Account Information</h3>
              <p className="text-sm text-muted-foreground">
                When you create an account, we collect your name, email address, and profile information from your Google account if you choose to sign in with Google.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Property Information</h3>
              <p className="text-sm text-muted-foreground">
                We store property names, addresses (optional), and calendar URLs you provide for synchronization purposes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cleaner Information</h3>
              <p className="text-sm text-muted-foreground">
                We collect cleaner names, phone numbers, and email addresses to facilitate communication and schedule management.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Calendar Data</h3>
              <p className="text-sm text-muted-foreground">
                We sync and store booking information from your Airbnb calendars, including check-in/out dates and guest names.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Provide cleaning schedule management services</li>
              <li>Send schedule notifications to cleaners (with your permission)</li>
              <li>Synchronize with external calendar systems</li>
              <li>Improve our services and user experience</li>
              <li>Communicate important updates about the service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Data Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We do not sell, trade, or rent your personal information. We may share your data only in these circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>With cleaners:</strong> Schedule information is shared with assigned cleaners</li>
              <li><strong>Service providers:</strong> We use trusted third parties for SMS (Twilio) and email (SendGrid) delivery</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4 mt-3">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure database with row-level security</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Your Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of communications</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We retain your data for as long as your account is active. Schedule history is kept for 12 months for analytics purposes. 
              You can request deletion of your account and all associated data at any time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you have questions about this privacy policy or your data, please contact us at:
            </p>
            <p className="text-sm font-medium mt-3">
              Email: privacy@cleansweep.app<br />
              Address: [Your Business Address]
            </p>
          </CardContent>
        </Card>

        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-muted-foreground">
            By using CleanSweep, you agree to this Privacy Policy.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}