
'use client';

import React, { useState } from 'react';
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
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Page for configuring application settings.
export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });

    try {
      // Get all listings
      const listingsRes = await fetch('/api/listings');
      if (!listingsRes.ok) throw new Error('Failed to fetch listings');
      
      const listings = await listingsRes.json();
      const airbnbListings = listings.filter((listing: any) => listing.is_active_on_airbnb && listing.ics_url);
      
      setSyncProgress({ current: 0, total: airbnbListings.length });
      
      if (airbnbListings.length === 0) {
        toast({
          title: 'No listings to sync',
          description: 'No active Airbnb listings found with calendar URLs',
        });
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Sync each listing
      for (let i = 0; i < airbnbListings.length; i++) {
        const listing = airbnbListings[i];
        setSyncProgress({ current: i + 1, total: airbnbListings.length });
        
        try {
          const syncRes = await fetch(`/api/listings/${listing.id}/sync`, {
            method: 'POST',
          });
          
          if (syncRes.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to sync ${listing.name}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error syncing ${listing.name}:`, error);
        }
      }

      // Show results
      if (errorCount === 0) {
        toast({
          title: 'Sync completed successfully',
          description: `All ${successCount} listings have been synced`,
        });
      } else {
        toast({
          title: 'Sync completed with errors',
          description: `${successCount} succeeded, ${errorCount} failed`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync listings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };
  return (
    <AppLayout>
      {/* Main layout for the settings page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Settings" />

        <div className="grid gap-6">
          {/* Card for Calendar Sync */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar Sync</CardTitle>
              <CardDescription>
                Sync all Airbnb calendars to get the latest bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sync All Listings</p>
                    <p className="text-sm text-muted-foreground">
                      Sync all active Airbnb listings with their calendar URLs
                    </p>
                  </div>
                  <Button 
                    onClick={handleSyncAll} 
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync All
                      </>
                    )}
                  </Button>
                </div>
                
                {isSyncing && syncProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{syncProgress.current} / {syncProgress.total}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Automatic Sync</p>
                  <div className="flex items-center space-x-3">
                    <Switch id="auto-sync" />
                    <Label htmlFor="auto-sync" className="text-sm font-normal">
                      Automatically sync all listings daily at 3:00 AM
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
