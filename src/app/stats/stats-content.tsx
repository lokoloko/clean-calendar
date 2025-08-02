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
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const result = await response.json();
      setData(result);
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load statistics</p>
        </div>
      </AppLayout>
    );
  }

  const { summary, monthlyStats, topCleaners, feedbackStats } = data;
  
  // Calculate trend
  const currentMonthRevenue = monthlyStats[monthlyStats.length - 1]?.total_revenue || 0;
  const lastMonthRevenue = monthlyStats[monthlyStats.length - 2]?.total_revenue || 0;
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
        <PageHeader title="Analytics & Statistics" />

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
                  <LineChart data={monthlyStats}>
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
                {monthlyStats.slice().reverse().map((month: any) => (
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