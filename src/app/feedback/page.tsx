'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import PageHeader from '@/components/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar as CalendarIcon, Download, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  schedule_item_id: string;
  cleaner_id: string;
  cleaner_name: string;
  listing_id: string;
  listing_name: string;
  cleanliness_rating: 'clean' | 'normal' | 'dirty';
  notes: string | null;
  completed_at: string;
  check_out: string;
}

interface FeedbackStats {
  total: number;
  clean: number;
  normal: number;
  dirty: number;
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    clean: 0,
    normal: 0,
    dirty: 0
  });
  
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedListing, setSelectedListing] = useState<string>('all');
  const [selectedCleaner, setSelectedCleaner] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  
  const [listings, setListings] = useState<{ id: string; name: string }[]>([]);
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
    calculateStats();
  }, [feedbackItems, dateRange, selectedListing, selectedCleaner, selectedRating]);

  const fetchData = async () => {
    try {
      const [feedbackRes, listingsRes, cleanersRes] = await Promise.all([
        fetch('/api/cleaner/feedback'),
        fetch('/api/listings'),
        fetch('/api/cleaners')
      ]);

      if (!feedbackRes.ok || !listingsRes.ok || !cleanersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const feedbackData = await feedbackRes.json();
      const listingsData = await listingsRes.json();
      const cleanersData = await cleanersRes.json();

      setFeedbackItems(feedbackData);
      setListings(listingsData);
      setCleaners(cleanersData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...feedbackItems];

    // Date filter
    if (dateRange.from) {
      filtered = filtered.filter(item => {
        const date = parseISO(item.completed_at);
        return date >= dateRange.from!;
      });
    }
    if (dateRange.to) {
      filtered = filtered.filter(item => {
        const date = parseISO(item.completed_at);
        return date <= dateRange.to!;
      });
    }

    // Listing filter
    if (selectedListing !== 'all') {
      filtered = filtered.filter(item => item.listing_id === selectedListing);
    }

    // Cleaner filter
    if (selectedCleaner !== 'all') {
      filtered = filtered.filter(item => item.cleaner_id === selectedCleaner);
    }

    // Rating filter
    if (selectedRating !== 'all') {
      filtered = filtered.filter(item => item.cleanliness_rating === selectedRating);
    }

    setFilteredItems(filtered);
  };

  const calculateStats = () => {
    const newStats: FeedbackStats = {
      total: filteredItems.length,
      clean: 0,
      normal: 0,
      dirty: 0
    };

    filteredItems.forEach(item => {
      newStats[item.cleanliness_rating]++;
    });

    setStats(newStats);
  };

  const getCleanlinessDisplay = (rating: string) => {
    switch (rating) {
      case 'clean':
        return {
          icon: <Sparkles className="h-4 w-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Clean'
        };
      case 'normal':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Normal'
        };
      case 'dirty':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          label: 'Dirty'
        };
      default:
        return null;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Property', 'Cleaner', 'Rating', 'Notes'];
    const rows = filteredItems.map(item => [
      format(parseISO(item.completed_at), 'yyyy-MM-dd'),
      item.listing_name,
      item.cleaner_name,
      item.cleanliness_rating,
      item.notes || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Cleaning Feedback">
          <Button onClick={exportToCSV} disabled={filteredItems.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cleanings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                Clean
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.clean}
                {stats.total > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({Math.round((stats.clean / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Normal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.normal}
                {stats.total > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({Math.round((stats.normal / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Dirty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.dirty}
                {stats.total > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({Math.round((stats.dirty / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                    />
                    <div className="p-3 border-t">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: subDays(new Date(), 7),
                            to: new Date()
                          })}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: subDays(new Date(), 30),
                            to: new Date()
                          })}
                        >
                          Last 30 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateRange({
                            from: startOfMonth(new Date()),
                            to: endOfMonth(new Date())
                          })}
                        >
                          This month
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Property Filter */}
              <div>
                <label className="text-sm font-medium">Property</label>
                <Select value={selectedListing} onValueChange={setSelectedListing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {listings.map(listing => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cleaner Filter */}
              <div>
                <label className="text-sm font-medium">Cleaner</label>
                <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cleaners</SelectItem>
                    {cleaners.map(cleaner => (
                      <SelectItem key={cleaner.id} value={cleaner.id}>
                        {cleaner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-sm font-medium">Rating</label>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="clean">Clean</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="dirty">Dirty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Cleaner</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No feedback found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const cleanlinessInfo = getCleanlinessDisplay(item.cleanliness_rating);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {format(parseISO(item.completed_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{item.listing_name}</TableCell>
                          <TableCell>{item.cleaner_name}</TableCell>
                          <TableCell>
                            {cleanlinessInfo && (
                              <div className={cn("flex items-center gap-1", cleanlinessInfo.color)}>
                                {cleanlinessInfo.icon}
                                <span className="font-medium">{cleanlinessInfo.label}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md">
                            {item.notes || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}