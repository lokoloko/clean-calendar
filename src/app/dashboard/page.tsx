'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { DollarSign, Home, Users, CalendarCheck2, AlertCircle, RefreshCw, Plus, ArrowRight, Clock, CheckCircle2, UserPlus, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, formatRelative } from "date-fns";

interface DashboardStats {
  totalListings: number;
  activeCleaners: number;
  upcomingCleanings: number;
  monthlyRevenue: number;
}

interface TodayCleaning {
  id: string;
  listing_name: string;
  cleaner_name: string;
  checkout_time: string;
  status: string;
}

interface NeedsAttention {
  id: string;
  listing_name: string;
  issue: string;
  checkout_date: string;
}

interface RecentActivity {
  id: string;
  type: 'sync' | 'feedback' | 'assignment' | 'cleaning_completed';
  title: string;
  description: string;
  timestamp: Date;
  icon?: string;
}

// The main dashboard page for a quick overview of the application's state.
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeCleaners: 0,
    upcomingCleanings: 0,
    monthlyRevenue: 0
  });
  const [todaysCleanings, setTodaysCleanings] = useState<TodayCleaning[]>([]);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttention[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's a pending calendar URL from the landing page
    const pendingUrl = sessionStorage.getItem('pendingCalendarUrl');
    if (pendingUrl) {
      sessionStorage.removeItem('pendingCalendarUrl');
      // Redirect to listings page with the URL as a query parameter
      router.push(`/listings?import=${encodeURIComponent(pendingUrl)}`);
      toast({
        title: "Calendar URL detected",
        description: "Redirecting to create your first listing...",
      });
    }
    
    // Fetch real data from API
    fetchDashboardStats();
  }, [router, toast]);

  const fetchDashboardStats = async () => {
    try {
      const [listingsRes, cleanersRes, scheduleRes, assignmentsRes, feedbackRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/cleaners'),
        fetch('/api/schedule'),
        fetch('/api/assignments'),
        fetch('/api/cleaner/feedback')
      ]);

      if (listingsRes.ok && cleanersRes.ok) {
        const listings = await listingsRes.json();
        const cleaners = await cleanersRes.json();
        const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
        
        // Get last sync time from listings
        if (listings.length > 0) {
          const syncTimes = listings
            .filter((l: any) => l.last_sync)
            .map((l: any) => new Date(l.last_sync));
          if (syncTimes.length > 0) {
            setLastSyncTime(new Date(Math.max(...syncTimes.map((d: Date) => d.getTime()))));
          }
        }
        
        // Calculate upcoming cleanings and today's cleanings
        let upcomingCount = 0;
        let monthlyRevenue = 0;
        const todayCleanings: TodayCleaning[] = [];
        const attentionItems: NeedsAttention[] = [];
        
        if (scheduleRes.ok) {
          const schedule = await scheduleRes.json();
          const now = new Date();
          const today = format(now, 'yyyy-MM-dd');
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          schedule.forEach((item: any) => {
            const checkoutDate = new Date(item.check_out);
            const checkoutDateStr = format(checkoutDate, 'yyyy-MM-dd');
            
            // Count upcoming cleanings in next 7 days
            if (checkoutDate > now && checkoutDate <= next7Days && item.status !== 'cancelled') {
              upcomingCount++;
            }
            
            // Calculate monthly cleaning costs
            if (checkoutDate >= startOfMonth && checkoutDate <= now) {
              const listing = listings.find((l: any) => l.id === item.listing_id);
              if (listing) {
                monthlyRevenue += parseFloat(listing.cleaning_fee || 0);
              }
            }
            
            // Today's cleanings
            if (checkoutDateStr === today && item.status !== 'cancelled') {
              todayCleanings.push({
                id: item.id,
                listing_name: item.listing_name,
                cleaner_name: item.cleaner_name || 'Unassigned',
                checkout_time: item.checkout_time || '11:00 AM',
                status: item.status
              });
              
              // Check if needs attention (no cleaner assigned)
              if (!item.cleaner_id) {
                attentionItems.push({
                  id: item.id,
                  listing_name: item.listing_name,
                  issue: 'No cleaner assigned',
                  checkout_date: today
                });
              }
            }
            
            // Check for same-day turnovers that need attention
            if (item.status !== 'cancelled' && checkoutDate > now) {
              const nextGuest = schedule.find((s: any) => 
                s.listing_id === item.listing_id && 
                s.check_in === item.check_out &&
                s.id !== item.id
              );
              if (nextGuest) {
                attentionItems.push({
                  id: item.id,
                  listing_name: item.listing_name,
                  issue: 'Same-day turnover',
                  checkout_date: checkoutDateStr
                });
              }
            }
          });
        }

        // Generate recent activity
        const activities: RecentActivity[] = [];
        
        // Add recent feedback
        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          feedbackData.slice(0, 3).forEach((fb: any) => {
            if (fb.completed_at) {
              activities.push({
                id: `feedback-${fb.id}`,
                type: 'feedback',
                title: `${fb.listing_name} cleaned`,
                description: `${fb.cleaner_name} completed cleaning${fb.cleanliness_rating ? ` - ${fb.cleanliness_rating === 5 ? '😊 Clean' : fb.cleanliness_rating === 3 ? '😐 Normal' : '😟 Dirty'}` : ''}`,
                timestamp: new Date(fb.completed_at),
                icon: 'CheckCircle2'
              });
            }
          });
        }
        
        // Add recent sync activities (simulated based on listing updates)
        listings.slice(0, 2).forEach((listing: any) => {
          if (listing.last_sync_at) {
            activities.push({
              id: `sync-${listing.id}`,
              type: 'sync',
              title: `${listing.name} synced`,
              description: 'Calendar synchronized successfully',
              timestamp: new Date(listing.last_sync_at),
              icon: 'RefreshCw'
            });
          }
        });
        
        // Add recent assignments
        if (assignments.length > 0) {
          const recentAssignment = assignments[0];
          activities.push({
            id: `assignment-${recentAssignment.id}`,
            type: 'assignment',
            title: 'Cleaner assigned',
            description: `${recentAssignment.cleaner_name} assigned to ${recentAssignment.listing_name}`,
            timestamp: new Date(recentAssignment.created_at),
            icon: 'UserPlus'
          });
        }
        
        // Sort by timestamp and limit to 5
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setStats({
          totalListings: listings.length,
          activeCleaners: cleaners.length,
          upcomingCleanings: upcomingCount,
          monthlyRevenue
        });
        setTodaysCleanings(todayCleanings);
        setNeedsAttention(attentionItems.slice(0, 5)); // Limit to 5 items
        setRecentActivity(activities.slice(0, 5));
      }
    } catch (error) {
      toast({
        title: "Error loading dashboard",
        description: "Some data may not be displayed correctly",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-all', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sync complete",
          description: `Updated ${result.summary.successful} listings, ${result.summary.failed} failed`,
        });
        setLastSyncTime(new Date());
        fetchDashboardStats(); // Refresh data
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "There was an error syncing calendars",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-8">
      {/* Page Header Component */}
      <PageHeader title="Dashboard">
        <div className="flex gap-2 items-center">
          <div className="flex flex-col items-end mr-4">
            <Button 
              onClick={handleSyncAll} 
              variant="outline" 
              size="sm"
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All'}
            </Button>
            {lastSyncTime && (
              <p className="text-xs text-muted-foreground mt-1">
                Last sync: {formatRelative(lastSyncTime, new Date())}
              </p>
            )}
          </div>
          <Button asChild size="sm">
            <Link href="/schedule">
              View Schedule
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </PageHeader>
      
      {/* Grid for displaying key metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Reusable card for displaying total listings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">
              properties being managed
            </p>
          </CardContent>
        </Card>

        {/* Reusable card for displaying active cleaners */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Cleaners
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.activeCleaners}</div>
            <p className="text-xs text-muted-foreground">
              cleaners available
            </p>
          </CardContent>
        </Card>

        {/* Reusable card for displaying upcoming cleanings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Cleanings</CardTitle>
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.upcomingCleanings}</div>
            <p className="text-xs text-muted-foreground">
              next 7 days
            </p>
          </CardContent>
        </Card>

        {/* Reusable card for displaying estimated monthly cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Cleaning Costs
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${loading ? "..." : stats.monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              cleaning fees this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Cleanings and Needs Attention Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Cleanings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarCheck2 className="h-5 w-5" />
                Today's Cleanings
              </span>
              <Badge variant="secondary">{todaysCleanings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : todaysCleanings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No cleanings scheduled for today</div>
            ) : (
              <div className="space-y-3">
                {todaysCleanings.map((cleaning) => (
                  <div key={cleaning.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{cleaning.listing_name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {cleaning.checkout_time}
                        {cleaning.cleaner_name !== 'Unassigned' && (
                          <>
                            <span>•</span>
                            <span>{cleaning.cleaner_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cleaning.status === 'completed' ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </Badge>
                      ) : cleaning.cleaner_name === 'Unassigned' ? (
                        <Badge variant="destructive">No cleaner</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Needs Attention
              </span>
              <Badge variant="secondary">{needsAttention.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : needsAttention.length === 0 ? (
              <div className="text-sm text-muted-foreground">All good! No items need attention.</div>
            ) : (
              <div className="space-y-3">
                {needsAttention.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.listing_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.issue} • {item.checkout_date}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/schedule?highlight=${item.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon === 'CheckCircle2' ? CheckCircle2 : 
                               activity.icon === 'RefreshCw' ? RefreshCw : 
                               activity.icon === 'UserPlus' ? UserPlus : Activity;
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`mt-1 ${
                        activity.type === 'feedback' ? 'text-green-600' :
                        activity.type === 'sync' ? 'text-blue-600' :
                        activity.type === 'assignment' ? 'text-purple-600' :
                        'text-gray-600'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{activity.title}</div>
                        <div className="text-xs text-muted-foreground">{activity.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelative(activity.timestamp, new Date())}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/listings">
                <Home className="h-4 w-4 mr-2" />
                Add Property
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cleaners">
                <Users className="h-4 w-4 mr-2" />
                Add Cleaner
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/schedule">
                <Plus className="h-4 w-4 mr-2" />
                Add Manual Cleaning
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/assignments">
                <Users className="h-4 w-4 mr-2" />
                Manage Assignments
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
