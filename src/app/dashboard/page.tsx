'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { DollarSign, Home, Users, CalendarCheck2, AlertCircle, RefreshCw, Plus, ArrowRight, Clock, CheckCircle2, UserPlus, Activity, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, formatRelative, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

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

interface Cleaner {
  id: string;
  name: string;
}

interface ScheduleItem {
  id: string;
  listing_id: string;
  listing_name: string;
  cleaner_id: string;
  cleaner_name: string;
  check_in: string;
  check_out: string;
  status: string;
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
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    step: 'selectCleaner' as 'selectCleaner' | 'selectType' | 'selectDates' | 'showExport',
    selectedCleanerId: '',
    exportType: 'today' as 'today' | 'range',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    exportText: ''
  });
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

  // Helper to parse date strings as local dates
  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateStr);
      return new Date();
    }
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid date string:', dateStr);
      return new Date();
    }
    return new Date(year, month - 1, day);
  };

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard data...');
      const response = await fetch('/api/dashboard/metrics-v2');
      
      if (!response.ok) {
        if (response.status === 401) {
          // Authentication required - redirect to login
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch dashboard metrics');
      }

      const data = await response.json();
      
      // Check if response is an error object
      if (data && data.error) {
        console.error('API returned error:', data.error);
        throw new Error(data.error.message || 'API error occurred');
      }
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      // Destructure the unified response with defaults
      const {
        listings = [],
        cleaners = [],
        schedule = [],
        feedbackStats = {},
        recentFeedback = [],
        upcomingCleanings = [],
        metrics = {}
      } = data;

      console.log('API response:', response.status);

      console.log('Data received:', {
        listings: Array.isArray(listings) ? listings.length : 0,
        cleaners: Array.isArray(cleaners) ? cleaners.length : 0,
        schedule: Array.isArray(schedule) ? schedule.length : 0,
        recentFeedback: Array.isArray(recentFeedback) ? recentFeedback.length : 0,
        feedbackStats,
        metrics
      });

      // Store cleaners and schedule for export functionality
      setCleaners(Array.isArray(cleaners) ? cleaners : []);
      setScheduleItems(Array.isArray(schedule) ? schedule : []);
      
      // Get last sync time from listings
      if (Array.isArray(listings) && listings.length > 0) {
        const syncTimes = listings
          .filter((l: any) => l.last_synced_at)
          .map((l: any) => new Date(l.last_synced_at));
        if (Array.isArray(syncTimes) && syncTimes.length > 0) {
          setLastSyncTime(new Date(Math.max(...syncTimes.map((d: Date) => d.getTime()))));
        }
      }
      
      // Use metrics from API
      const todayCleanings: TodayCleaning[] = [];
      const attentionItems: NeedsAttention[] = [];
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      // Calculate monthly revenue from completed cleanings
      let monthlyRevenue = 0;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Ensure schedule is an array before iterating
      if (Array.isArray(schedule)) {
        schedule.forEach((item: any) => {
          const checkoutDate = parseLocalDate(item.check_out);
          const checkoutDateStr = format(checkoutDate, 'yyyy-MM-dd');
          
          // Calculate monthly cleaning costs
          if (checkoutDate >= startOfMonth && checkoutDate <= now && (item.is_completed || item.feedback_id)) {
            // Ensure listings is an array before using find
            const listing = Array.isArray(listings) ? listings.find((l: any) => l.id === item.listing_id) : null;
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
          
          // Check if needs attention (no cleaner assigned for today's cleaning)
          if (!item.cleaner_id) {
            attentionItems.push({
              id: item.id,
              listing_name: item.listing_name,
              issue: 'No cleaner assigned',
              checkout_date: today
            });
          }
        }
        
        // Check for unassigned future cleanings (excluding today which is handled above)
        if (item.status !== 'cancelled' && checkoutDate > now && !item.cleaner_id && checkoutDateStr !== today) {
          attentionItems.push({
            id: item.id,
            listing_name: item.listing_name,
            issue: 'No cleaner assigned',
            checkout_date: checkoutDateStr
          });
        }
        
        // Check for same-day turnovers that need attention
        if (item.status !== 'cancelled' && checkoutDate >= now) {
          const nextGuest = Array.isArray(schedule) ? schedule.find((s: any) => 
            s.listing_id === item.listing_id && 
            s.check_in === item.check_out &&
            s.id !== item.id
          ) : null;
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
      
      // Add recent feedback (only if authenticated and response is ok)
      if (Array.isArray(recentFeedback) && recentFeedback.length > 0) {
        recentFeedback.slice(0, 3).forEach((fb: any) => {
          if (fb.completed_at) {
            activities.push({
              id: `feedback-${fb.id}`,
              type: 'feedback',
              title: `${fb.listing_name} cleaned`,
              description: `${fb.cleaner_name} completed cleaning${fb.cleanliness_rating ? ` - ${fb.cleanliness_rating === 'clean' ? '😊 Clean' : fb.cleanliness_rating === 'normal' ? '😐 Normal' : '😟 Dirty'}` : ''}`,
              timestamp: new Date(fb.completed_at),
              icon: 'CheckCircle2'
            });
          }
        });
      }
      
      // Add recent sync activities (simulated based on listing updates)
      if (Array.isArray(listings)) {
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
      }
      
      // Sort by timestamp and limit to 5
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setStats({
        totalListings: metrics.totalListings || 0,
        activeCleaners: metrics.activeCleaners || 0,
        upcomingCleanings: Array.isArray(upcomingCleanings) ? upcomingCleanings.length : 0,
        monthlyRevenue: metrics.monthlyRevenue || monthlyRevenue || 0
      });
      setTodaysCleanings(todayCleanings);
      setNeedsAttention(attentionItems.slice(0, 5)); // Limit to 5 items
      setRecentActivity(activities.slice(0, 5));
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Dashboard loading error:', error);
      toast({
        title: "Error loading dashboard",
        description: error instanceof Error ? error.message : "Some data may not be displayed correctly",
        variant: "destructive"
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // For manual sync, we'll use a different approach since CRON_SECRET is server-side only
      // We'll create a separate endpoint for manual sync that uses regular auth
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
        if (response.status === 401) {
          router.push('/login');
          return;
        }
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

  // Find the next check-in for a given listing
  const getNextCheckIn = (listingId: string, currentCheckout: string, currentBookingId: string): string => {
    try {
      const checkoutDateObj = parseLocalDate(currentCheckout);
      if (isNaN(checkoutDateObj.getTime())) {
        return 'Invalid date';
      }
      
      const checkoutDateStr = format(checkoutDateObj, 'yyyy-MM-dd');
      
      // Look for same-day turnaround
      const sameDay = Array.isArray(scheduleItems) ? scheduleItems.find(item => {
        if (item.listing_id !== listingId || item.id === currentBookingId) return false;
        const checkinDate = parseLocalDate(item.check_in);
        const checkinStr = !isNaN(checkinDate.getTime()) ? format(checkinDate, 'yyyy-MM-dd') : '';
        return checkinStr === checkoutDateStr;
      }) : null;
      
      if (sameDay) {
        return 'Same day';
      }
      
      // Find next booking
      const futureBookings = Array.isArray(scheduleItems) ? scheduleItems
        .filter(item => {
          if (item.listing_id !== listingId || item.id === currentBookingId) return false;
          const checkinDate = parseLocalDate(item.check_in);
          return !isNaN(checkinDate.getTime()) && checkinDate >= checkoutDateObj;
        })
        .sort((a, b) => parseLocalDate(a.check_in).getTime() - parseLocalDate(b.check_in).getTime()) : [];
      
      if (futureBookings.length > 0) {
        const nextBooking = futureBookings[0];
        const nextCheckin = parseLocalDate(nextBooking.check_in);
        const daysUntil = Math.ceil((nextCheckin.getTime() - checkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil === 0) return 'Same day';
        else if (daysUntil === 1) return 'Next day';
        else if (daysUntil <= 7) return `${daysUntil} days later`;
        else return format(nextCheckin, 'MMM d');
      }
      
      return 'No upcoming';
    } catch (error) {
      console.error('Error in getNextCheckIn:', error);
      return 'Error';
    }
  };

  const handleExport = () => {
    setExportModal({
      ...exportModal,
      isOpen: true,
      step: 'selectCleaner',
      selectedCleanerId: '',
      exportType: 'today',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      exportText: ''
    });
  };

  const generateExportForCleaner = (cleanerId: string, startDate: Date, endDate: Date) => {
    const cleanerItems = Array.isArray(scheduleItems) ? scheduleItems.filter(item => {
      if (item.cleaner_id !== cleanerId) return false;
      const checkoutDate = parseLocalDate(item.check_out);
      const checkoutDateStr = format(checkoutDate, 'yyyy-MM-dd');
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      return checkoutDateStr >= startDateStr && checkoutDateStr <= endDateStr && item.status !== 'cancelled';
    }) : [];

    const itemsByDate = new Map<string, ScheduleItem[]>();
    cleanerItems.forEach(item => {
      const dateKey = format(parseLocalDate(item.check_out), 'yyyy-MM-dd');
      if (!itemsByDate.has(dateKey)) {
        itemsByDate.set(dateKey, []);
      }
      itemsByDate.get(dateKey)!.push(item);
    });

    let exportText = '';
    
    if (exportModal.exportType === 'range') {
      exportText += `Schedule for ${format(startDate, 'MMMM d')} - ${format(endDate, 'MMMM d, yyyy')}:\n\n`;
    }
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayItems = itemsByDate.get(dateKey) || [];
      
      if (exportModal.exportType === 'today' && format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
        exportText += `Today's Cleanings - ${format(currentDate, 'MMMM d')}:\n`;
      } else {
        exportText += `${format(currentDate, 'EEEE, MMMM d')}:\n`;
      }
      
      if (dayItems.length === 0) {
        exportText += 'No cleanings scheduled\n';
      } else {
        dayItems.forEach(item => {
          const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id);
          exportText += `${item.listing_name}`;
          
          if (nextCheckIn === 'Same day' || nextCheckIn === 'Next day') {
            exportText += ` - ${nextCheckIn}`;
          } else if (nextCheckIn !== 'No upcoming') {
            exportText += ` - Next: ${nextCheckIn}`;
          }
          
          exportText += '\n';
        });
      }
      
      exportText += '\n';
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return exportText.trim();
  };

  const handleExportNext = () => {
    if (exportModal.step === 'selectCleaner') {
      if (!exportModal.selectedCleanerId) {
        toast({
          title: 'Error',
          description: 'Please select a cleaner',
          variant: 'destructive',
        });
        return;
      }
      setExportModal({ ...exportModal, step: 'selectType' });
    } else if (exportModal.step === 'selectType') {
      if (exportModal.exportType === 'today') {
        const today = new Date();
        const exportText = generateExportForCleaner(
          exportModal.selectedCleanerId,
          today,
          today
        );
        setExportModal({ ...exportModal, step: 'showExport', exportText });
      } else {
        setExportModal({ ...exportModal, step: 'selectDates' });
      }
    } else if (exportModal.step === 'selectDates') {
      const exportText = generateExportForCleaner(
        exportModal.selectedCleanerId,
        exportModal.startDate,
        exportModal.endDate
      );
      setExportModal({ ...exportModal, step: 'showExport', exportText });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportModal.exportText);
      toast({
        title: 'Success',
        description: 'Schedule copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
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
          <Button onClick={handleExport} size="sm" variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Schedule
          </Button>
          <Button asChild size="sm">
            <Link href="/schedule">
              View Schedule
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </PageHeader>
      
      {/* Grid for displaying key metric cards - Mobile optimized */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
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
            <div className="text-2xl font-bold">${loading ? "..." : stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              cleaning fees this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Cleanings and Needs Attention Grid - Stack on mobile */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Today's Cleanings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarCheck2 className="h-5 w-5" />
                Today's Cleanings
              </span>
              <Badge variant="secondary">{Array.isArray(todaysCleanings) ? todaysCleanings.length : 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : !Array.isArray(todaysCleanings) || todaysCleanings.length === 0 ? (
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
              <Badge variant="secondary">{Array.isArray(needsAttention) ? needsAttention.length : 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : !Array.isArray(needsAttention) || needsAttention.length === 0 ? (
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
            ) : !Array.isArray(recentActivity) || recentActivity.length === 0 ? (
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

      {/* Export Modal */}
      <Dialog open={exportModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          setExportModal({ ...exportModal, isOpen: false, step: 'selectCleaner', selectedCleanerId: '', exportText: '' });
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Export Schedule</DialogTitle>
            <DialogDescription>
              {exportModal.step === 'selectCleaner' && 'Select a cleaner to export their schedule'}
              {exportModal.step === 'selectType' && 'Choose the export type'}
              {exportModal.step === 'selectDates' && 'Select the date range for the export'}
              {exportModal.step === 'showExport' && 'Copy this schedule to send to the cleaner'}
            </DialogDescription>
          </DialogHeader>

          {exportModal.step === 'selectCleaner' && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select Cleaner</Label>
                <Select
                  value={exportModal.selectedCleanerId}
                  onValueChange={(value) => setExportModal({ ...exportModal, selectedCleanerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(cleaners) && cleaners.map((cleaner) => (
                      <SelectItem key={cleaner.id} value={cleaner.id}>
                        {cleaner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {exportModal.step === 'selectType' && (
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="export-today"
                    name="exportType"
                    value="today"
                    checked={exportModal.exportType === 'today'}
                    onChange={() => setExportModal({ ...exportModal, exportType: 'today' })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="export-today" className="font-normal cursor-pointer">
                    Today only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="export-range"
                    name="exportType"
                    value="range"
                    checked={exportModal.exportType === 'range'}
                    onChange={() => setExportModal({ ...exportModal, exportType: 'range' })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="export-range" className="font-normal cursor-pointer">
                    Date range
                  </Label>
                </div>
              </div>
            </div>
          )}

          {exportModal.step === 'selectDates' && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="export-start-date">Start Date</Label>
                <Input
                  id="export-start-date"
                  type="date"
                  value={format(exportModal.startDate, 'yyyy-MM-dd')}
                  onChange={(e) => setExportModal({ ...exportModal, startDate: parseLocalDate(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="export-end-date">End Date</Label>
                <Input
                  id="export-end-date"
                  type="date"
                  value={format(exportModal.endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setExportModal({ ...exportModal, endDate: parseLocalDate(e.target.value) })}
                  min={format(exportModal.startDate, 'yyyy-MM-dd')}
                />
              </div>
            </div>
          )}

          {exportModal.step === 'showExport' && (
            <div className="grid gap-4 py-4">
              <Textarea
                value={exportModal.exportText}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
              <Button onClick={copyToClipboard} variant="secondary">
                Copy to Clipboard
              </Button>
            </div>
          )}

          <DialogFooter>
            {exportModal.step !== 'selectCleaner' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (exportModal.step === 'selectType') {
                    setExportModal({ ...exportModal, step: 'selectCleaner' });
                  } else if (exportModal.step === 'selectDates') {
                    setExportModal({ ...exportModal, step: 'selectType' });
                  } else if (exportModal.step === 'showExport') {
                    setExportModal({ ...exportModal, step: exportModal.exportType === 'today' ? 'selectType' : 'selectDates' });
                  }
                }}
              >
                Back
              </Button>
            )}
            {exportModal.step !== 'showExport' && (
              <Button onClick={handleExportNext}>
                Next
              </Button>
            )}
            {exportModal.step === 'showExport' && (
              <Button onClick={() => setExportModal({ ...exportModal, isOpen: false })}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
