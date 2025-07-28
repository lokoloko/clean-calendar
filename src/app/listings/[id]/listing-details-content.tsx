'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Clock, 
  Users, 
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Home,
  MessageSquare,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Listing {
  id: string;
  name: string;
  ics_url: string;
  cleaning_fee: number;
  timezone: string;
  last_sync: string | null;
  is_active_on_airbnb?: boolean;
  created_at: string;
}

interface Cleaner {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Assignment {
  cleaner_id: string;
  cleaner_name: string;
}

interface ScheduleItem {
  id: string;
  check_out: string;
  checkout_time: string;
  cleaner_name: string | null;
  status: string;
  guest_name: string | null;
  feedback_id: string | null;
  cleanliness_rating: number | null;
  feedback_notes: string | null;
  feedback_completed_at: string | null;
}

interface FeedbackStats {
  total_cleanings: number;
  with_feedback: number;
  clean_count: number;
  normal_count: number;
  dirty_count: number;
  average_rating: number;
}

export default function ListingDetailsContent({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentCleanings, setRecentCleanings] = useState<ScheduleItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [listingId]);

  const fetchData = async () => {
    try {
      // Fetch listing details
      const listingRes = await fetch(`/api/listings/${listingId}`);
      if (!listingRes.ok) {
        throw new Error('Failed to fetch listing');
      }
      const listingData = await listingRes.json();
      setListing(listingData);

      // Fetch assignments
      const assignmentsRes = await fetch(`/api/listings/${listingId}/assignments`);
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData);
      }

      // Fetch recent cleanings with feedback
      const cleaningsRes = await fetch(`/api/listings/${listingId}/cleanings?limit=10`);
      if (cleaningsRes.ok) {
        const cleaningsData = await cleaningsRes.json();
        setRecentCleanings(cleaningsData);
      }

      // Calculate feedback stats
      const statsRes = await fetch(`/api/listings/${listingId}/feedback/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setFeedbackStats(statsData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load listing details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!listing) return;
    
    setSyncing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/sync`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Sync completed',
          description: `Synced ${data.itemsCreated} new items, ${data.itemsUpdated} updated`,
        });
        
        // Update the last sync time
        setListing(prev => prev ? { ...prev, last_sync: data.lastSync } : null);
        
        // Refresh data
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: 'Sync failed',
          description: error.error || 'Failed to sync calendar',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync calendar',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getRatingIcon = (rating: number | null) => {
    if (rating === null) return null;
    if (rating === 5) return '😊';
    if (rating === 3) return '😐';
    return '😟';
  };

  const getRatingColor = (rating: number | null) => {
    if (rating === null) return 'text-muted-foreground';
    if (rating === 5) return 'text-green-600';
    if (rating === 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!listing) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Listing not found
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/listings')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <PageHeader title={listing.name} />
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={listing.is_active_on_airbnb ? 'default' : 'secondary'}>
                  {listing.is_active_on_airbnb ? 'Active on Airbnb' : 'Inactive'}
                </Badge>
                {listing.last_sync && (
                  <span className="text-sm text-muted-foreground">
                    Last synced: {format(new Date(listing.last_sync), 'MMM d, h:mm a')}
                  </span>
                )}
              </div>
            </div>
          </div>
          {listing.ics_url && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Sync Calendar
                </>
              )}
            </Button>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cleaning Fee</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${listing.cleaning_fee}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Cleaners</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground">
                {assignments.map(a => a.cleaner_name).join(', ') || 'None assigned'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timezone</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{listing.timezone}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calendar Sync</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {listing.ics_url ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Not connected</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feedback Stats */}
        {feedbackStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Cleanliness Feedback
              </CardTitle>
              <CardDescription>
                Based on {feedbackStats.with_feedback} reviews from {feedbackStats.total_cleanings} total cleanings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Feedback Coverage</span>
                    <span>{Math.round((feedbackStats.with_feedback / feedbackStats.total_cleanings) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(feedbackStats.with_feedback / feedbackStats.total_cleanings) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Rating Breakdown */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl mb-1">😊</div>
                    <div className="text-2xl font-bold text-green-600">
                      {feedbackStats.clean_count}
                    </div>
                    <p className="text-sm text-muted-foreground">Clean</p>
                    <p className="text-xs text-muted-foreground">
                      {feedbackStats.with_feedback > 0 
                        ? `${Math.round((feedbackStats.clean_count / feedbackStats.with_feedback) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">😐</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {feedbackStats.normal_count}
                    </div>
                    <p className="text-sm text-muted-foreground">Normal</p>
                    <p className="text-xs text-muted-foreground">
                      {feedbackStats.with_feedback > 0 
                        ? `${Math.round((feedbackStats.normal_count / feedbackStats.with_feedback) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">😟</div>
                    <div className="text-2xl font-bold text-red-600">
                      {feedbackStats.dirty_count}
                    </div>
                    <p className="text-sm text-muted-foreground">Dirty</p>
                    <p className="text-xs text-muted-foreground">
                      {feedbackStats.with_feedback > 0 
                        ? `${Math.round((feedbackStats.dirty_count / feedbackStats.with_feedback) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Cleanings</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Cleanings</CardTitle>
                <CardDescription>
                  Last 10 cleanings with feedback information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Cleaner</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCleanings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No cleanings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentCleanings.map((cleaning) => (
                          <TableRow key={cleaning.id}>
                            <TableCell>
                              {format(new Date(cleaning.check_out), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {cleaning.cleaner_name || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              {cleaning.guest_name || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                cleaning.status === 'completed' ? 'default' :
                                cleaning.status === 'confirmed' ? 'secondary' :
                                'outline'
                              }>
                                {cleaning.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cleaning.feedback_id ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-lg ${getRatingColor(cleaning.cleanliness_rating)}`}>
                                    {getRatingIcon(cleaning.cleanliness_rating)}
                                  </span>
                                  {cleaning.feedback_notes && (
                                    <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={cleaning.feedback_notes}>
                                      {cleaning.feedback_notes}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No feedback</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Listing Settings</CardTitle>
                <CardDescription>
                  Configure settings for this property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Property ID</div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{listing.id}</code>
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Created</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(listing.created_at), 'MMMM d, yyyy')}
                  </div>
                </div>
                {listing.ics_url && (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Calendar URL</div>
                    <div className="text-xs text-muted-foreground break-all">
                      {listing.ics_url}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}