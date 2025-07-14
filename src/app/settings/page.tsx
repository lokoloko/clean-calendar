
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <PageHeader title="Settings" />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Messaging Preferences</CardTitle>
              <CardDescription>
                Configure how and when cleaners receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sms-provider">SMS Provider</Label>
                  <Select defaultValue="twilio">
                    <SelectTrigger id="sms-provider" className="w-[300px]">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="send-time">Send Time</Label>
                  <Input id="send-time" type="time" defaultValue="06:00" className="w-[300px]" />
                </div>
                <Button className="w-fit">Save Preferences</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Manage how you log in to the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                  <Label>OAuth Provider</Label>
                  <Input value="Google" readOnly disabled className="w-[300px] bg-muted/50" />
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
