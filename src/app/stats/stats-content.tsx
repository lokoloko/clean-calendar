'use client';

import { useEffect, useState } from 'react';
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

const chartConfig: ChartConfig = {
  cleanings: {
    label: "Cleanings",
    color: "hsl(var(--chart-1))",
  },
  costs: {
    label: "Costs",
    color: "hsl(var(--chart-2))",
  },
  feedback: {
    label: "Feedback",
    color: "hsl(var(--chart-3))",
  }
};

const COLORS: Record<string, string> = {
  clean: '#10b981',
  normal: '#3b82f6',
  dirty: '#f59e0b'
};

export default function StatsContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<string>('all');
  const [filteredData, setFilteredData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (data) {
      filterDataByListing();
    }
  }, [selectedListing, data]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const result = await response.json();
      setData(result);
      setFilteredData(result); // Initialize filtered data
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

  const filterDataByListing = () => {
    if (!data) return;
    
    if (selectedListing === 'all') {
      setFilteredData(data);
      return;
    }

    // Filter schedule items by listing
    const filteredSchedule = data.schedule.filter((item: any) => 
      item.listing_id === selectedListing
    );
    
    // Filter feedback by listing
    const filteredFeedback = data.feedback.filter((item: any) => 
      item.schedule_items?.listing_id === selectedListing
    );

    // Recalculate stats for filtered data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Current month schedule
    const currentMonthSchedule = filteredSchedule.filter((s: any) => {
      const checkOut = new Date(s.check_out);
      return checkOut.getMonth() === currentMonth && checkOut.getFullYear() === currentYear;
    });
    
    // Current month feedback
    const currentMonthFeedback = filteredFeedback.filter((f: any) => {
      const created = new Date(f.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    });
    
    // Get the selected listing's cleaning fee
    const selectedListingData = data.listings.find((l: any) => l.id === selectedListing);
    const cleaningFee = selectedListingData?.cleaning_fee || 0;
    
    // Calculate current month revenue
    const currentMonthRevenue = currentMonthSchedule.length * cleaningFee;
    
    // Calculate feedback stats
    const feedbackStats = {
      total: currentMonthFeedback.length,
      clean: currentMonthFeedback.filter((f: any) => f.cleanliness_rating === 'clean').length,
      normal: currentMonthFeedback.filter((f: any) => f.cleanliness_rating === 'normal').length,
      dirty: currentMonthFeedback.filter((f: any) => f.cleanliness_rating === 'dirty').length
    };
    
    // Completion rate
    const completedCleanings = currentMonthSchedule.filter((s: any) => 
      s.is_completed || s.status === 'completed'
    ).length;
    const completionRate = currentMonthSchedule.length > 0 
      ? Math.round((completedCleanings / currentMonthSchedule.length) * 100)
      : 0;

    // Recalculate monthly stats for filtered data
    const monthlyStats: any[] = [];
    const monthsWithData = new Set<string>();
    
    filteredSchedule.forEach((s: any) => {
      const checkOut = new Date(s.check_out);
      const monthKey = `${checkOut.getFullYear()}-${String(checkOut.getMonth() + 1).padStart(2, '0')}`;
      monthsWithData.add(monthKey);
    });
    
    Array.from(monthsWithData).sort().forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      
      const monthSchedule = filteredSchedule.filter((s: any) => {
        const checkOut = new Date(s.check_out);
        return checkOut.getMonth() === month - 1 && checkOut.getFullYear() === year;
      });
      
      const monthFeedback = filteredFeedback.filter((f: any) => {
        const created = new Date(f.created_at);
        return created.getMonth() === month - 1 && created.getFullYear() === year;
      });
      
      if (monthSchedule.length > 0) {
        monthlyStats.push({
          month: monthKey,
          total_cleanings: monthSchedule.length,
          completed_cleanings: monthSchedule.filter((s: any) => s.is_completed || s.status === 'completed').length,
          total_revenue: monthSchedule.length * cleaningFee,
          feedback_count: monthFeedback.length,
          clean_count: monthFeedback.filter((f: any) => f.cleanliness_rating === 'clean').length,
          normal_count: monthFeedback.filter((f: any) => f.cleanliness_rating === 'normal').length,
          dirty_count: monthFeedback.filter((f: any) => f.cleanliness_rating === 'dirty').length
        });
      }
    });

    // Filter cleaner stats for this listing
    const cleanerStats = new Map();
    filteredSchedule.forEach((s: any) => {
      if (!s.cleaner_id) return;
      
      const cleanerData = data.cleaners.find((c: any) => c.id === s.cleaner_id);
      const stats = cleanerStats.get(s.cleaner_id) || {
        cleaner_id: s.cleaner_id,
        cleaner_name: cleanerData?.name || 'Unknown',
        total_cleanings: 0,
        completed_cleanings: 0,
        feedback_count: 0,
        ratings: { clean: 0, normal: 0, dirty: 0 }
      };
      
      stats.total_cleanings++;
      if (s.is_completed || s.status === 'completed') {
        stats.completed_cleanings++;
      }
      
      cleanerStats.set(s.cleaner_id, stats);
    });
    
    // Add feedback to cleaner stats
    filteredFeedback.forEach((f: any) => {
      const cleanerId = f.schedule_items?.cleaner_id;
      if (!cleanerId) return;
      
      const stats = cleanerStats.get(cleanerId);
      if (stats) {
        stats.feedback_count++;
        if (f.cleanliness_rating === 'clean') stats.ratings.clean++;
        else if (f.cleanliness_rating === 'normal') stats.ratings.normal++;
        else if (f.cleanliness_rating === 'dirty') stats.ratings.dirty++;
      }
    });
    
    // Convert to array and calculate metrics
    const topCleaners = Array.from(cleanerStats.values())
      .map(stats => ({
        ...stats,
        completion_rate: stats.total_cleanings > 0 
          ? Math.round((stats.completed_cleanings / stats.total_cleanings) * 100)
          : 0,
        average_rating: stats.feedback_count > 0
          ? ((stats.ratings.clean * 3 + stats.ratings.normal * 2 + stats.ratings.dirty * 1) / stats.feedback_count).toFixed(1)
          : null
      }))
      .sort((a, b) => b.total_cleanings - a.total_cleanings)
      .slice(0, 5);

    setFilteredData({
      ...data,
      summary: {
        totalListings: selectedListing === 'all' ? data.summary.totalListings : 1,
        totalCleanings: currentMonthSchedule.length,
        completedCleanings,
        monthlyRevenue: currentMonthRevenue,
        completionRate,
        feedbackStats,
        averageRating: feedbackStats.total > 0
          ? ((feedbackStats.clean * 3 + feedbackStats.normal * 2 + feedbackStats.dirty * 1) / feedbackStats.total).toFixed(1)
          : null
      },
      monthlyStats,
      topCleaners
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!data || !filteredData) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load statistics</p>
        </div>
      </AppLayout>
    );
  }

  const { summary, monthlyStats, topCleaners, feedbackStats } = filteredData;
  
  // Calculate trend - compare current month to previous month if available
  const sortedMonthlyStats = [...monthlyStats].sort((a, b) => a.month.localeCompare(b.month));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthData = sortedMonthlyStats.find(m => m.month === currentMonth);
  const currentMonthRevenue = currentMonthData?.total_revenue || summary.monthlyRevenue || 0;
  
  // Find previous month in the data
  const lastMonthRevenue = sortedMonthlyStats[sortedMonthlyStats.length - 2]?.total_revenue || 0;
  const revenueTrend = currentMonthRevenue > lastMonthRevenue ? 'up' : 
                       currentMonthRevenue < lastMonthRevenue ? 'down' : 'stable';
  const revenueChange = lastMonthRevenue > 0 
    ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  const pieData = [
    { name: 'Clean', value: summary.feedbackStats.clean },
    { name: 'Normal', value: summary.feedbackStats.normal },
    { name: 'Dirty', value: summary.feedbackStats.dirty }
  ].filter(item => item.value > 0);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <PageHeader title="Analytics & Statistics" />
          <div className="w-64">
            <Select value={selectedListing} onValueChange={setSelectedListing}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {data.listings.map((listing: any) => (
                  <SelectItem key={listing.id} value={listing.id}>
                    {listing.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalListings}</div>
              <p className="text-xs text-muted-foreground">Active listings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Costs</CardTitle>
              {revenueTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {revenueTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
              {revenueTrend === 'stable' && <Minus className="h-4 w-4 text-gray-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.monthlyRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {revenueChange !== 0 && (
                  <span className={revenueTrend === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {revenueChange > 0 ? '+' : ''}{revenueChange}% from last month
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cleanings This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCleanings}</div>
              <p className="text-xs text-muted-foreground">
                {summary.completedCleanings} completed ({summary.completionRate}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.averageRating || 'N/A'}
                {summary.averageRating && <span className="text-sm text-muted-foreground">/3.0</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                From {summary.feedbackStats.total} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Cleanings and costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedMonthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => format(new Date(value + '-01'), 'MMM')}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_cleanings"
                      stroke={chartConfig.cleanings.color}
                      name="Cleanings"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="total_revenue"
                      stroke={chartConfig.costs.color}
                      name="Costs ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Cleanliness Ratings */}
          <Card>
            <CardHeader>
              <CardTitle>Cleanliness Feedback</CardTitle>
              <CardDescription>Distribution of cleanliness ratings</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No feedback data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Cleaners */}
        <Card>
          <CardHeader>
            <CardTitle>Top Cleaners Performance</CardTitle>
            <CardDescription>Cleaners ranked by total cleanings</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cleaner</TableHead>
                  <TableHead className="text-center">Total Cleanings</TableHead>
                  <TableHead className="text-center">Completion Rate</TableHead>
                  <TableHead className="text-center">Average Rating</TableHead>
                  <TableHead className="text-center">Feedback Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCleaners.map((cleaner: any) => (
                  <TableRow key={cleaner.cleaner_id}>
                    <TableCell className="font-medium">{cleaner.cleaner_name}</TableCell>
                    <TableCell className="text-center">{cleaner.total_cleanings}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={cleaner.completion_rate} className="w-16" />
                        <span className="text-sm">{cleaner.completion_rate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {cleaner.average_rating ? (
                        <Badge variant={
                          parseFloat(cleaner.average_rating) >= 2.5 ? 'default' :
                          parseFloat(cleaner.average_rating) >= 1.5 ? 'secondary' : 'destructive'
                        }>
                          {cleaner.average_rating}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{cleaner.feedback_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Monthly Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Detailed statistics by month</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-center">Cleanings</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Cost</TableHead>
                  <TableHead className="text-center">Feedback</TableHead>
                  <TableHead className="text-center">Clean</TableHead>
                  <TableHead className="text-center">Normal</TableHead>
                  <TableHead className="text-center">Dirty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMonthlyStats.map((month: any) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">
                      {format(new Date(month.month + '-01'), 'MMMM yyyy')}
                    </TableCell>
                    <TableCell className="text-center">{month.total_cleanings}</TableCell>
                    <TableCell className="text-center">{month.completed_cleanings}</TableCell>
                    <TableCell className="text-center">${month.total_revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{month.feedback_count}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600">{month.clean_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-blue-600">{month.normal_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-orange-600">{month.dirty_count}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}