
'use client';

import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Settings state
  const [settings, setSettings] = useState({
    auto_sync_enabled: true,
    auto_sync_time: '03:00',
    sms_provider: 'twilio',
    send_weekly_schedule: true,
    send_daily_reminders: true,
    weekly_schedule_day: 'sunday',
    daily_reminder_time: '06:00',
    require_confirmation: false
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          auto_sync_enabled: data.auto_sync_enabled ?? true,
          auto_sync_time: data.auto_sync_time?.slice(0, 5) ?? '03:00',
          sms_provider: data.sms_provider ?? 'twilio',
          send_weekly_schedule: data.send_weekly_schedule ?? true,
          send_daily_reminders: data.send_daily_reminders ?? true,
          weekly_schedule_day: data.weekly_schedule_day ?? 'sunday',
          daily_reminder_time: data.daily_reminder_time?.slice(0, 5) ?? '06:00',
          require_confirmation: data.require_confirmation ?? false
        });
      }
    } catch (error) {
      // Error loading settings, use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          auto_sync_time: settings.auto_sync_time + ':00',
          daily_reminder_time: settings.daily_reminder_time + ':00'
        })
      });
      
      if (res.ok) {
        toast({
          title: 'Settings saved',
          description: 'Your preferences have been updated successfully.',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          }
        } catch (error) {
          errorCount++;
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
                    <Switch 
                      id="auto-sync" 
                      checked={settings.auto_sync_enabled}
                      onCheckedChange={(checked) => setSettings({...settings, auto_sync_enabled: checked})}
                    />
                    <Label htmlFor="auto-sync" className="text-sm font-normal">
                      Automatically sync all listings daily at {settings.auto_sync_time}
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
                    <Select 
                      value={settings.sms_provider}
                      onValueChange={(value) => setSettings({...settings, sms_provider: value})}
                    >
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
                      <Checkbox 
                        id="weekly-schedule" 
                        checked={settings.send_weekly_schedule}
                        onCheckedChange={(checked) => setSettings({...settings, send_weekly_schedule: !!checked})}
                      />
                      <Label htmlFor="weekly-schedule">Weekly Schedule</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="daily-reminders" 
                        checked={settings.send_daily_reminders}
                        onCheckedChange={(checked) => setSettings({...settings, send_daily_reminders: !!checked})}
                      />
                      <Label htmlFor="daily-reminders">Daily Reminders</Label>
                    </div>
                  </div>
                  {/* Section for configuring when to send the weekly schedule */}
                  <div className="grid gap-4">
                    <Label className="font-semibold">When to Send Weekly Schedule</Label>
                    <RadioGroup 
                      value={settings.weekly_schedule_day}
                      onValueChange={(value) => setSettings({...settings, weekly_schedule_day: value})}
                      className="flex gap-4"
                    >
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
                  <Input 
                    id="send-time" 
                    type="time" 
                    value={settings.daily_reminder_time}
                    onChange={(e) => setSettings({...settings, daily_reminder_time: e.target.value})}
                    className="w-full md:w-[300px]" 
                  />
                </div>

                <Separator />
                
                {/* Section for requiring confirmation from cleaners */}
                <div className="grid gap-4">
                    <Label className="font-semibold">Confirmation</Label>
                    <div className="flex items-center space-x-3">
                        <Switch 
                          id="require-reply" 
                          checked={settings.require_confirmation}
                          onCheckedChange={(checked) => setSettings({...settings, require_confirmation: checked})}
                        />
                        <Label htmlFor="require-reply">Require cleaners to reply 'DONE' after each cleaning</Label>
                    </div>
                </div>

                <Button 
                  className="w-fit" 
                  onClick={handleSaveSettings}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
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
