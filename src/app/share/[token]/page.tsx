'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Loader2, AlertCircle, List, CalendarDays, CalendarRange } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WeeklyView } from '@/components/schedule/weekly-view';
import { MonthlyView } from '@/components/schedule/monthly-view';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface Params {
  token: string;
}

interface Props {
  params: Promise<Params>;
}

type ScheduleStatus = 'pending' | 'confirmed' | 'declined' | 'completed';

const statusMap: Record<ScheduleStatus, { text: string, variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
  pending: { text: 'Pending', variant: 'outline', icon: null },
  confirmed: { text: 'Confirmed', variant: 'secondary', icon: null },
  declined: { text: 'Declined', variant: 'destructive', icon: null },
  completed: { text: 'Completed', variant: 'default', icon: null },
};

interface ScheduleItem {
  id: string;
  check_in: string;
  check_out: string;
  checkout_time: string;
  guest_name: string | null;
  notes: string | null;
  status: string;
  source: 'airbnb' | 'manual' | 'manual_recurring';
  listing_id: string;
  listing_name: string;
  listing_timezone: string;
  cleaner_id: string;
  cleaner_name: string;
  cleaner_phone: string | null;
}

interface SharedData {
  token: {
    name: string;
    expires_at: string;
  };
  scheduleItems: ScheduleItem[];
  cleaners: Array<{ id: string; name: string }>;
  listings: Array<{ id: string; name: string }>;
}

// Helper to parse date strings as local dates
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Invalid date string:', dateStr);
    return new Date();
  }
  return new Date(year, month - 1, day);
};

// Helper to get timezone abbreviation
const getTimezoneAbbr = (timezone: string): string => {
  const abbreviations: { [key: string]: string } = {
    'America/New_York': 'EST',
    'America/Chicago': 'CST',
    'America/Denver': 'MST',
    'America/Los_Angeles': 'PST',
    'America/Phoenix': 'AZ',
    'Pacific/Honolulu': 'HST',
    'America/Anchorage': 'AKST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Asia/Tokyo': 'JST',
    'Australia/Sydney': 'AEDT'
  };
  return abbreviations[timezone] || timezone.split('/')[1];
};

export default function SharedSchedulePage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharedData | null>(null);
  const [viewType, setViewType] = useState<'list' | 'week' | 'month'>('list');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchSharedData();
  }, []);

  const fetchSharedData = async () => {
    try {
      const response = await fetch(`/api/schedule/share?token=${resolvedParams.token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load shared schedule');
      }

      const sharedData = await response.json();
      setData(sharedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared schedule');
    } finally {
      setLoading(false);
    }
  };

  // Get items for a specific date
  const getItemsForDate = (targetDate: Date) => {
    if (!data) return [];
    return data.scheduleItems.filter(item => {
      const itemDate = parseLocalDate(item.check_out);
      return format(itemDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd');
    });
  };

  // Check if a date has same-day turnaround
  const hasSameDayTurnaround = (date: Date) => {
    const items = getItemsForDate(date);
    return items.some(item => {
      const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id);
      return nextCheckIn === 'Same day';
    });
  };

  // Find the next check-in for a given listing
  const getNextCheckIn = (listingId: string, currentCheckout: string, currentBookingId: string): string => {
    if (!data) return 'Unknown';
    
    try {
      const checkoutDateObj = parseLocalDate(currentCheckout);
      if (isNaN(checkoutDateObj.getTime())) {
        return 'Invalid date';
      }
      
      const checkoutDateStr = format(checkoutDateObj, 'yyyy-MM-dd');
      
      // Look for same-day check-in
      const sameDay = data.scheduleItems.find(item => {
        if (item.listing_id !== listingId || item.id === currentBookingId) return false;
        const checkinDate = parseLocalDate(item.check_in);
        const checkinStr = !isNaN(checkinDate.getTime()) ? format(checkinDate, 'yyyy-MM-dd') : '';
        return checkinStr === checkoutDateStr;
      });
      
      if (sameDay) {
        return 'Same day';
      }
      
      // Find next booking
      const futureBookings = data.scheduleItems
        .filter(item => {
          if (item.listing_id !== listingId || item.id === currentBookingId) return false;
          const checkinDate = parseLocalDate(item.check_in);
          return !isNaN(checkinDate.getTime()) && checkinDate >= checkoutDateObj;
        })
        .sort((a, b) => parseLocalDate(a.check_in).getTime() - parseLocalDate(b.check_in).getTime());
      
      if (futureBookings.length > 0) {
        const nextCheckin = parseLocalDate(futureBookings[0].check_in);
        const daysUntil = Math.ceil((nextCheckin.getTime() - checkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil === 0) {
          return 'Same day';
        } else if (daysUntil === 1) {
          return 'Next day';
        } else if (daysUntil <= 7) {
          return `${daysUntil} days later`;
        } else {
          return format(nextCheckin, 'MMM d');
        }
      }
      
      return 'No upcoming';
    } catch (error) {
      console.error('Error in getNextCheckIn:', error);
      return 'Error';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>
            {error || 'Unable to load the shared schedule. The link may be expired or invalid.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isExpired = new Date(data.token.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {data.token.name || 'Shared Cleaning Schedule'}
            </h1>
            {isExpired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : (
              <p className="text-muted-foreground">
                This link expires on {format(new Date(data.token.expires_at), 'PPP')}
              </p>
            )}
          </div>

          {/* Schedule Tabs */}
          <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'list' | 'week' | 'month')}>
            <TabsList className="mb-4">
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-2">
                <CalendarRange className="h-4 w-4" />
                Month
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-0">
              <div className="border rounded-xl shadow-sm bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Checkout Date</TableHead>
                      <TableHead>Next Check-in</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Cleaner</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.scheduleItems.map((item) => {
                      const checkoutDate = parseLocalDate(item.check_out);
                      const isValidDate = !isNaN(checkoutDate.getTime());
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {isValidDate ? format(checkoutDate, 'MMM d, yyyy') : 'Invalid date'}
                            <span className="text-sm text-muted-foreground block">
                              {item.checkout_time || '11:00 AM'}
                              {item.listing_timezone && item.listing_timezone !== 'America/New_York' && (
                                <span className="text-xs ml-1">({getTimezoneAbbr(item.listing_timezone)})</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "font-medium",
                              getNextCheckIn(item.listing_id, item.check_out, item.id) === 'Same day' && "text-orange-600",
                              getNextCheckIn(item.listing_id, item.check_out, item.id) === 'Next day' && "text-yellow-600"
                            )}>
                              {getNextCheckIn(item.listing_id, item.check_out, item.id)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.listing_name}
                              {item.source === 'manual' && (
                                <Badge variant="secondary" className="text-xs">Manual</Badge>
                              )}
                              {item.source === 'manual_recurring' && (
                                <Badge variant="secondary" className="text-xs">Recurring</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.cleaner_name}
                            {item.cleaner_phone && (
                              <span className="text-sm text-muted-foreground block">
                                {item.cleaner_phone}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusMap[item.status as ScheduleStatus]?.variant || 'outline'}>
                              {statusMap[item.status as ScheduleStatus]?.text || item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="week" className="mt-0">
              <WeeklyView
                weekDays={Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(currentWeek);
                  date.setDate(date.getDate() - date.getDay() + i);
                  return date;
                })}
                getItemsForDate={getItemsForDate}
                hasSameDayTurnaround={hasSameDayTurnaround}
                currentWeek={currentWeek}
                setCurrentWeek={setCurrentWeek}
                onDateClick={() => {}} // No action for shared view
              />
            </TabsContent>

            <TabsContent value="month" className="mt-0">
              <MonthlyView
                getItemsForDate={getItemsForDate}
                hasSameDayTurnaround={hasSameDayTurnaround}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                onDateClick={() => {}} // No action for shared view
              />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            Powered by CleanSweep Scheduler
          </div>
        </div>
      </div>
    </div>
  );
}