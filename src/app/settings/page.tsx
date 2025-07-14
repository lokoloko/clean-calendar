
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// Page for configuring application settings.
export default function SettingsPage() {
  return (
    <AppLayout>
      {/* Main layout for the settings page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Settings" />

        <div className="grid gap-6">
          {/* Card for Messaging Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Messaging Preferences</CardTitle>
              <CardDescription>
                Configure how and when cleaners receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Form for messaging settings */}
              <form className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="sms-provider">SMS Provider</Label>
                    {/* TODO: Connect this to a backend service like Twilio. */}
                    <Select defaultValue="twilio">
                      <SelectTrigger id="sms-provider" className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                
                {/* Section for configuring what notifications to send */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-4">
                    <Label className="font-semibold">What to Send Cleaners</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="weekly-schedule" defaultChecked />
                      <Label htmlFor="weekly-schedule">Weekly Schedule</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="daily-reminders" defaultChecked />
                      <Label htmlFor="daily-reminders">Daily Reminders</Label>
                    </div>
                  </div>
                  {/* Section for configuring when to send the weekly schedule */}
                  <div className="grid gap-4">
                    <Label className="font-semibold">When to Send Weekly Schedule</Label>
                    <RadioGroup defaultValue="sunday" className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sunday" id="sunday" />
                        <Label htmlFor="sunday">Sunday</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monday" id="monday" />
                        <Label htmlFor="monday">Monday</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                {/* Input for setting the daily reminder time */}
                <div className="grid gap-2">
                  <Label htmlFor="send-time">Daily Reminder Time</Label>
                  <Input id="send-time" type="time" defaultValue="06:00" className="w-full md:w-[300px]" />
                </div>

                <Separator />
                
                {/* Section for requiring confirmation from cleaners */}
                <div className="grid gap-4">
                    <Label className="font-semibold">Confirmation</Label>
                    <div className="flex items-center space-x-3">
                        <Switch id="require-reply" />
                        <Label htmlFor="require-reply">Require cleaners to reply 'DONE' after each cleaning</Label>
                    </div>
                </div>

                {/* TODO: Implement save functionality */}
                <Button className="w-fit">Save Preferences</Button>
              </form>
            </CardContent>
          </Card>

          {/* Card for Authentication settings */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Manage how you log in to the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Displaying the OAuth provider, currently read-only */}
              <div className="grid gap-2">
                  <Label>OAuth Provider</Label>
                  <Input value="Google" readOnly disabled className="w-full md:w-[300px] bg-muted/50" />
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
