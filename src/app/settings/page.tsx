
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
import { RefreshCw, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Page for configuring application settings.
export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
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
    loadSubscriptionInfo();
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

  const loadSubscriptionInfo = async () => {
    try {
      const res = await fetch('/api/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error('Error loading subscription info:', error);
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
    setSyncProgress({ current: 0, total: 1 }); // Show indeterminate progress

    try {
      // First get the number of listings to sync for progress tracking
      const listingsRes = await fetch('/api/listings');
      if (listingsRes.ok) {
        const listings = await listingsRes.json();
        const syncableListings = listings.filter((listing: any) => listing.ics_url);
        if (syncableListings.length > 0) {
          setSyncProgress({ current: 0, total: syncableListings.length });
        }
      }

      // Use the bulk sync endpoint
      const syncRes = await fetch('/api/sync-all', {
        method: 'POST',
      });
      
      if (!syncRes.ok) {
        const error = await syncRes.text();
        throw new Error(error || 'Failed to sync calendars');
      }
      
      const result = await syncRes.json();
      
      if (result.success) {
        const { successful, failed, skipped, total } = result.summary;
        
        // Show full progress when complete
        setSyncProgress({ current: total, total: total });
        
        if (failed === 0 && skipped === 0) {
          toast({
            title: 'Sync completed successfully',
            description: `All ${successful} listings have been synced`,
          });
        } else {
          let description = `${successful} succeeded`;
          if (failed > 0) description += `, ${failed} failed`;
          if (skipped > 0) description += `, ${skipped} skipped`;
          
          toast({
            title: 'Sync completed with issues',
            description,
            variant: failed > 0 ? 'destructive' : 'default',
          });
        }
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing listings:', error);
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync listings. Please try again.',
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
                      Sync all listings that have calendar URLs
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
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sms-provider">SMS Provider</Label>
                      {subscriptionInfo?.tier === 'free' && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Lock className="h-3 w-3" />
                          Starter/Pro only
                        </Badge>
                      )}
                    </div>
                    <Select 
                      value={settings.sms_provider}
                      onValueChange={(value) => setSettings({...settings, sms_provider: value})}
                      disabled={subscriptionInfo?.tier === 'free'}
                    >
                      <SelectTrigger id="sms-provider" className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="twilio" disabled={!subscriptionInfo?.features?.sms}>
                          SMS (Twilio) {!subscriptionInfo?.features?.sms && '- Starter/Pro'}
                        </SelectItem>
                        <SelectItem value="whatsapp" disabled={!subscriptionInfo?.features?.whatsapp}>
                          WhatsApp {!subscriptionInfo?.features?.whatsapp && '- Pro only'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {subscriptionInfo?.tier === 'free' && (
                      <p className="text-sm text-muted-foreground">
                        Upgrade to <Link href="/billing/upgrade" className="underline">Starter or Pro</Link> to enable SMS notifications
                      </p>
                    )}
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
