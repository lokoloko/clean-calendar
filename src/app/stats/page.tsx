
'use client';

import { AppLayout } from "@/components/layout";
import PageHeader from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, TrendingUp, TrendingDown, Minus } from "lucide-react";

// Configuration for the charts on this page.
const chartConfig: ChartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--chart-1))",
  },
  turnovers: {
    label: "Turnovers",
    color: "hsl(var(--chart-2))",
  },
  days: {
    label: "Days",
  }
};

interface StatsData {
  weeklyBookingData: { week: string; bookings: number }[];
  checkoutDayData: { day: string; checkouts: number }[];
  bookingDetails: {
    id: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    duration: string;
    listingName: string;
    guestName: string;
  }[];
  occupancyData: {
    booked: number;
    vacant: number;
  };
  totalBookings: number;
  averageStay: number;
  totalCost: number;
  feedbackStats: {
    total: number;
    withFeedback: number;
    cleanCount: number;
    normalCount: number;
    dirtyCount: number;
    averageRating: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// Page for displaying stats based on Airbnb calendar data.
export default function StatsPage() {
  const [selectedListing, setSelectedListing] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    weeklyBookingData: [],
    checkoutDayData: [],
    bookingDetails: [],
    occupancyData: { booked: 0, vacant: 100 },
    totalBookings: 0,
    averageStay: 0,
    totalCost: 0,
    feedbackStats: {
      total: 0,
      withFeedback: 0,
      cleanCount: 0,
      normalCount: 0,
      dirtyCount: 0,
      averageRating: 0,
      trend: 'stable'
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (listings.length > 0) {
      fetchStats();
    }
  }, [selectedListing, selectedMonth, listings]);

  const fetchListings = async () => {
    try {
      console.log('Fetching listings...');
      const response = await fetch('/api/listings');
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to fetch listings');
      }
      const data = await response.json();
      console.log('Listings data:', data);
      // Handle both old format (array) and new format (object with listings property)
      const listingsData = Array.isArray(data) ? data : (data.listings || []);
      console.log('Processed listings:', listingsData);
      setListings(listingsData);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listings',
        variant: 'destructive',
      });
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch schedule data including history
      const scheduleRes = await fetch('/api/schedule?includeHistory=true');
      if (!scheduleRes.ok) throw new Error('Failed to fetch schedule');
      const scheduleData = await scheduleRes.json();

      // Filter by selected listing
      let relevantSchedule = scheduleData;
      if (selectedListing !== 'all') {
        relevantSchedule = scheduleData.filter((item: any) => item.listing_id === selectedListing);
      }
      
      // Filter by month - include bookings that have ANY days in the selected month
      // Parse the month correctly - selectedMonth is in format "2025-07"
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthDate = new Date(year, month - 1, 1); // month - 1 because JS months are 0-indexed
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const filteredSchedule = relevantSchedule.filter((item: any) => {
        // Exclude cancelled bookings from stats
        if (item.status === 'cancelled') return false;
        
        // Parse dates as UTC to avoid timezone issues
        const checkInStr = item.check_in.split('T')[0];
        const checkOutStr = item.check_out.split('T')[0];
        const checkIn = new Date(checkInStr + 'T00:00:00');
        const checkOut = new Date(checkOutStr + 'T00:00:00');
        
        // Include if booking overlaps with selected month at all
        const overlaps = checkIn <= monthEnd && checkOut >= monthStart;
        
        return overlaps;
      });

      // Calculate weekly bookings
      const weeklyData = calculateWeeklyBookings(filteredSchedule);
      
      // Calculate checkout days
      const checkoutData = calculateCheckoutDays(filteredSchedule);
      
      // Calculate booking details
      const details = filteredSchedule.map((item: any) => {
        const checkInStr = item.check_in.split('T')[0];
        const checkOutStr = item.check_out.split('T')[0];
        const checkIn = new Date(checkInStr + 'T00:00:00');
        const checkOut = new Date(checkOutStr + 'T00:00:00');
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine if it's back-to-back (check if another booking starts on checkout day)
        const isBackToBack = scheduleData.some((other: any) => 
          other.id !== item.id && 
          other.listing_id === item.listing_id &&
          format(new Date(other.check_in), 'yyyy-MM-dd') === format(checkOut, 'yyyy-MM-dd')
        );
        
        return {
          id: item.id,
          checkIn: format(checkIn, 'yyyy-MM-dd'),
          checkOut: format(checkOut, 'yyyy-MM-dd'),
          nights,
          duration: isBackToBack ? 'Back-to-back' : 'Standard',
          listingName: item.listing_name || 'Unknown',
          guestName: item.guest_name || 'Guest',
        };
      });

      // Calculate occupancy
      const totalDays = monthEnd.getDate();
      const bookedDays = calculateBookedDays(filteredSchedule, monthStart, monthEnd);
      
      const occupancy = {
        booked: Math.round((bookedDays / totalDays) * 100),
        vacant: Math.round(((totalDays - bookedDays) / totalDays) * 100),
      };

      // Calculate totals - only count bookings that checkout in the selected month
      const bookingsEndingThisMonth = filteredSchedule.filter((item: any) => {
        const checkoutMonth = format(new Date(item.check_out), 'yyyy-MM');
        return checkoutMonth === selectedMonth;
      });
      
      const totalBookings = bookingsEndingThisMonth.length;
      const averageStay = totalBookings > 0 
        ? bookingsEndingThisMonth.reduce((sum: number, item: any) => {
            const checkIn = new Date(item.check_in);
            const checkOut = new Date(item.check_out);
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            return sum + nights;
          }, 0) / totalBookings 
        : 0;
      
      // Calculate cleaning costs
      const listing = selectedListing !== 'all' 
        ? listings.find(l => l.id === selectedListing)
        : null;
      const cleaningFee = listing ? parseFloat(listing.cleaning_fee || 0) : 50; // Default $50
      const totalCost = totalBookings * cleaningFee;

      // Fetch feedback stats
      let feedbackStats = {
        total: 0,
        withFeedback: 0,
        cleanCount: 0,
        normalCount: 0,
        dirtyCount: 0,
        averageRating: 0,
        trend: 'stable' as 'up' | 'down' | 'stable'
      };

      try {
        const feedbackParams = new URLSearchParams();
        if (selectedListing !== 'all') {
          feedbackParams.append('listing_id', selectedListing);
        }
        
        // Set date range for feedback
        feedbackParams.append('date_from', format(monthStart, 'yyyy-MM-dd'));
        feedbackParams.append('date_to', format(monthEnd, 'yyyy-MM-dd'));
        
        const feedbackRes = await fetch(`/api/feedback?${feedbackParams}`);
        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          
          const cleaningsWithFeedback = feedbackData.filter((item: any) => item.cleanliness_rating !== null);
          const cleanCount = cleaningsWithFeedback.filter((item: any) => item.cleanliness_rating === 'clean' || item.cleanliness_rating === 5).length;
          const normalCount = cleaningsWithFeedback.filter((item: any) => item.cleanliness_rating === 'normal' || item.cleanliness_rating === 3).length;
          const dirtyCount = cleaningsWithFeedback.filter((item: any) => item.cleanliness_rating === 'dirty' || item.cleanliness_rating === 1).length;
          
          // Calculate average rating (convert string ratings to numeric)
          const totalRating = cleaningsWithFeedback.reduce((sum: number, item: any) => {
            if (typeof item.cleanliness_rating === 'number') {
              return sum + item.cleanliness_rating;
            }
            // Convert string ratings to numeric
            if (item.cleanliness_rating === 'clean') return sum + 5;
            if (item.cleanliness_rating === 'normal') return sum + 3;
            if (item.cleanliness_rating === 'dirty') return sum + 1;
            return sum;
          }, 0);
          const averageRating = cleaningsWithFeedback.length > 0 ? totalRating / cleaningsWithFeedback.length : 0;
          
          // Calculate trend by comparing to previous month
          const prevMonthStart = startOfMonth(subMonths(monthDate, 1));
          const prevMonthEnd = endOfMonth(subMonths(monthDate, 1));
          const prevFeedbackParams = new URLSearchParams();
          if (selectedListing !== 'all') {
            prevFeedbackParams.append('listing_id', selectedListing);
          }
          prevFeedbackParams.append('date_from', format(prevMonthStart, 'yyyy-MM-dd'));
          prevFeedbackParams.append('date_to', format(prevMonthEnd, 'yyyy-MM-dd'));
          
          const prevFeedbackRes = await fetch(`/api/feedback?${prevFeedbackParams}`);
          if (prevFeedbackRes.ok) {
            const prevFeedbackData = await prevFeedbackRes.json();
            const prevCleaningsWithFeedback = prevFeedbackData.filter((item: any) => item.cleanliness_rating !== null);
            const prevTotalRating = prevCleaningsWithFeedback.reduce((sum: number, item: any) => {
              if (typeof item.cleanliness_rating === 'number') {
                return sum + item.cleanliness_rating;
              }
              // Convert string ratings to numeric
              if (item.cleanliness_rating === 'clean') return sum + 5;
              if (item.cleanliness_rating === 'normal') return sum + 3;
              if (item.cleanliness_rating === 'dirty') return sum + 1;
              return sum;
            }, 0);
            const prevAverageRating = prevCleaningsWithFeedback.length > 0 ? prevTotalRating / prevCleaningsWithFeedback.length : 0;
            
            if (prevAverageRating > 0) {
              if (averageRating > prevAverageRating + 0.2) {
                feedbackStats.trend = 'up';
              } else if (averageRating < prevAverageRating - 0.2) {
                feedbackStats.trend = 'down';
              }
            }
          }
          
          feedbackStats = {
            total: feedbackData.length,
            withFeedback: cleaningsWithFeedback.length,
            cleanCount,
            normalCount,
            dirtyCount,
            averageRating: Math.round(averageRating * 10) / 10,
            trend: feedbackStats.trend
          };
        }
      } catch (error) {
        console.error('Error fetching feedback stats:', error);
      }

      setStats({
        weeklyBookingData: weeklyData,
        checkoutDayData: checkoutData,
        bookingDetails: details,
        occupancyData: occupancy,
        totalBookings,
        averageStay: Math.round(averageStay * 10) / 10,
        totalCost,
        feedbackStats
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyBookings = (schedule: any[]) => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const weekCounts = [0, 0, 0, 0];
    
    schedule.forEach(item => {
      const checkOutStr = item.check_out.split('T')[0];
      const checkOut = new Date(checkOutStr + 'T00:00:00');
      const day = checkOut.getDate();
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
      weekCounts[weekIndex]++;
    });
    
    return weeks.map((week, i) => ({ week, bookings: weekCounts[i] }));
  };

  const calculateCheckoutDays = (schedule: any[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    schedule.forEach(item => {
      const checkOutStr = item.check_out.split('T')[0];
      const checkOut = new Date(checkOutStr + 'T00:00:00');
      const dayIndex = checkOut.getDay();
      dayCounts[dayIndex]++;
    });
    
    return days.map((day, i) => ({ day, checkouts: dayCounts[i] }));
  };

  const calculateBookedDays = (schedule: any[], monthStart: Date, monthEnd: Date) => {
    const bookedDates = new Set<string>();
    
    schedule.forEach(item => {
      // Parse dates as UTC to avoid timezone issues
      const checkInStr = item.check_in.split('T')[0];
      const checkOutStr = item.check_out.split('T')[0];
      const checkIn = new Date(checkInStr + 'T00:00:00');
      const checkOut = new Date(checkOutStr + 'T00:00:00');
      
      // Start from the later of check-in or month start
      let current = new Date(Math.max(checkIn.getTime(), monthStart.getTime()));
      // End at the earlier of check-out or month end
      const end = new Date(Math.min(checkOut.getTime(), monthEnd.getTime()));
      
      // Count each day the property is occupied
      while (current <= end) {
        if (current >= monthStart && current <= monthEnd) {
          bookedDates.add(format(current, 'yyyy-MM-dd'));
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    return bookedDates.size;
  };

  return (
    <AppLayout>
      {/* Main layout for the stats page */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
                {/* Page Header Component */}
                <PageHeader title="Your Listing Stats" />
                <p className="text-muted-foreground mt-2">
                    Insights based on your Airbnb calendar data (current and future bookings only).
                </p>
            </div>
            {/* Listing and month selector for filtering stats */}
            <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                <div className="grid gap-2 w-full md:w-[200px]">
                    <Label htmlFor="listing-select">Select Listing</Label>
                    <Select value={selectedListing} onValueChange={setSelectedListing}>
                        <SelectTrigger id="listing-select" aria-label="Select listing">
                            <SelectValue placeholder="Choose a listing..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Listings</SelectItem>
                            {listings.map((listing) => (
                                <SelectItem key={listing.id} value={listing.id}>
                                    {listing.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2 w-full md:w-[200px]">
                    <Label htmlFor="month-select">Select Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger id="month-select" aria-label="Select month">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {eachMonthOfInterval({
                                start: new Date(), // Start from current month
                                end: addMonths(new Date(), 12)
                            }).map((date) => (
                                <SelectItem key={format(date, 'yyyy-MM')} value={format(date, 'yyyy-MM')}>
                                    {format(date, 'MMMM yyyy')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
        
        {/* Data availability notice for current month */}
        {format(new Date(), 'yyyy-MM') === selectedMonth && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700">
                ℹ️ Current month data includes bookings from today forward. Historical bookings are not available from Airbnb calendar feeds.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {/* Key Metrics Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Reusable card for displaying occupancy rate */}
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Rate</CardTitle>
              <CardDescription>
                % of days booked this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <p className="text-4xl font-bold">{loading ? "..." : `${stats.occupancyData.booked}%`}</p>
                <Progress value={stats.occupancyData.booked} aria-label={`${stats.occupancyData.booked}% occupancy`} />
              </div>
            </CardContent>
          </Card>
          {/* Reusable card for displaying average stay length */}
          <Card>
            <CardHeader>
              <CardTitle>Avg. Stay Length</CardTitle>
              <CardDescription>Average nights per booking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{loading ? "..." : `${stats.averageStay} nights`}</p>
            </CardContent>
          </Card>
          {/* Reusable card for displaying total bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Total Bookings</CardTitle>
              <CardDescription>Bookings this month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{loading ? "..." : stats.totalBookings}</p>
            </CardContent>
          </Card>
          {/* Reusable card with a mini bar chart for checkout day */}
          <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Most Common Checkout Day</CardTitle>
                <CardDescription>Day of week guests most often check out</CardDescription>
            </CardHeader>
            <CardContent>
                {/* MiniBarChart Component */}
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                    <BarChart data={stats.checkoutDayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={8}
                          domain={[0, 'dataMax + 1']}
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="checkouts" fill="hsl(var(--chart-1))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Cleanliness Metrics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Cleanliness Feedback
            </CardTitle>
            <CardDescription>
              Property condition ratings from cleaner feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="space-y-4">
                <div className="h-[200px]">
                  {stats.feedbackStats.withFeedback > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Clean', value: stats.feedbackStats.cleanCount, color: '#22c55e' },
                            { name: 'Normal', value: stats.feedbackStats.normalCount, color: '#eab308' },
                            { name: 'Dirty', value: stats.feedbackStats.dirtyCount, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#eab308" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No feedback data available
                    </div>
                  )}
                </div>
                <div className="flex justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Clean</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span>Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span>Dirty</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Average Rating</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {stats.feedbackStats.averageRating > 0 
                          ? `${stats.feedbackStats.averageRating}/5` 
                          : '-'
                        }
                      </span>
                      {stats.feedbackStats.trend === 'up' && (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                      {stats.feedbackStats.trend === 'down' && (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      {stats.feedbackStats.trend === 'stable' && (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={stats.feedbackStats.averageRating * 20} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cleanings</span>
                    <span className="font-medium">{stats.feedbackStats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">With Feedback</span>
                    <span className="font-medium">
                      {stats.feedbackStats.withFeedback} 
                      ({stats.feedbackStats.total > 0 
                        ? Math.round((stats.feedbackStats.withFeedback / stats.feedbackStats.total) * 100)
                        : 0
                      }%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center">
                    <div className="text-xl">😊</div>
                    <div className="text-lg font-bold text-green-600">
                      {stats.feedbackStats.cleanCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl">😐</div>
                    <div className="text-lg font-bold text-yellow-600">
                      {stats.feedbackStats.normalCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl">😟</div>
                    <div className="text-lg font-bold text-red-600">
                      {stats.feedbackStats.dirtyCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Line chart for weekly booking trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Booking Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* LineChart Component */}
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <LineChart data={stats.weeklyBookingData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="bookings" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            {/* Cleaning Cost Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Cleaning Cost</CardTitle>
                    <CardDescription>Total cleaning fees this month</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center h-[250px] w-full">
                        <p className="text-5xl font-bold">${loading ? "..." : stats.totalCost.toFixed(2)}</p>
                        <p className="text-muted-foreground mt-2">
                            {stats.totalBookings} bookings × ${selectedListing !== 'all' && listings.find(l => l.id === selectedListing) 
                                ? parseFloat(listings.find(l => l.id === selectedListing)?.cleaning_fee || 0).toFixed(2)
                                : "50.00"} avg fee
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Booking Detail Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Detail Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {/* BookingTable Component */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Nights</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : stats.bookingDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No bookings found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.bookingDetails.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.listingName}</TableCell>
                      <TableCell>{booking.checkIn}</TableCell>
                      <TableCell>{booking.checkOut}</TableCell>
                      <TableCell>{booking.nights}</TableCell>
                      <TableCell>
                        <Badge variant={booking.duration === 'Back-to-back' ? 'default' : 'secondary'}>
                          {booking.duration}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
