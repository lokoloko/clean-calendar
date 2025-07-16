'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { DollarSign, Home, Users, CalendarCheck2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalListings: number;
  activeCleaners: number;
  upcomingCleanings: number;
  monthlyRevenue: number;
}

// The main dashboard page for a quick overview of the application's state.
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeCleaners: 0,
    upcomingCleanings: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
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
      const [listingsRes, cleanersRes, scheduleRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/cleaners'),
        fetch('/api/schedule')
      ]);

      if (listingsRes.ok && cleanersRes.ok) {
        const listings = await listingsRes.json();
        const cleaners = await cleanersRes.json();
        
        // Calculate upcoming cleanings (schedule items in the future)
        let upcomingCount = 0;
        let monthlyRevenue = 0;
        
        if (scheduleRes.ok) {
          const schedule = await scheduleRes.json();
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          schedule.forEach((item: any) => {
            const checkoutDate = new Date(item.check_out);
            if (checkoutDate > now) {
              upcomingCount++;
            }
            if (checkoutDate >= startOfMonth && checkoutDate <= now) {
              const listing = listings.find((l: any) => l.id === item.listing_id);
              if (listing) {
                monthlyRevenue += parseFloat(listing.cleaning_fee || 0);
              }
            }
          });
        }

        setStats({
          totalListings: listings.length,
          activeCleaners: cleaners.length,
          upcomingCleanings: upcomingCount,
          monthlyRevenue
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-8">
      {/* Page Header Component */}
      <PageHeader title="Welcome, Admin" />
      
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
              in the next 7 days
            </p>
          </CardContent>
        </Card>

        {/* Reusable card for displaying estimated monthly cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${loading ? "..." : stats.monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              from completed cleanings
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Placeholder for additional dashboard components like recent activity or charts */}
    </div>
  )
}
