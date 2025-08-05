'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@gostudiom/ui';
import { Calendar, Clock, Home, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@gostudiom/ui';
import { Badge } from '@gostudiom/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gostudiom/ui';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths, isToday, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/format-utils';

interface ScheduleItem {
  id: string;
  listing_name: string;
  listing_address?: string;
  host_name?: string;
  check_in: string;
  check_out: string;
  checkout_time: string;
  guest_name?: string;
  is_completed: boolean;
  feedback_id?: string;
  cleanliness_rating?: string;
}

export default function CleanerShareSchedulePage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanerName, setCleanerName] = useState<string>('');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchSchedule();
  }, [params.token]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(`/api/cleaner/schedule/share/${params.token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Invalid or expired link');
        } else {
          setError('Failed to load schedule');
        }
        return;
      }

      const data = await response.json();
      setCleanerName(data.cleanerName);
      setScheduleItems(data.schedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const getItemsForDay = (date: Date) => {
    return scheduleItems.filter(item => {
      const checkoutDate = parseISO(item.check_out);
      return isSameDay(checkoutDate, date);
    });
  };

  const getWeekDays = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentWeek);
    const weekEnd = endOfWeek(currentWeek);
    const days = getWeekDays(weekStart);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid gap-4">
          {days.map((day) => {
            const items = getItemsForDay(day);
            const isCurrentDay = isToday(day);
            
            return (
              <div key={day.toISOString()} className={`border rounded-lg p-4 ${isCurrentDay ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{format(day, 'EEEE, MMM d')}</h4>
                  {isCurrentDay && <Badge variant="secondary">Today</Badge>}
                </div>
                
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cleanings scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Card key={item.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              {item.listing_name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Check-out by {formatTimeDisplay(item.checkout_time)}
                            </div>
                            {item.guest_name && (
                              <div className="text-sm text-muted-foreground">
                                Guest: {item.guest_name}
                              </div>
                            )}
                          </div>
                          {item.is_completed && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weeks = [];
    
    let currentWeekStart = startOfWeek(monthStart);
    while (currentWeekStart <= monthEnd) {
      weeks.push(currentWeekStart);
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        
        {weeks.map((weekStart) => {
          const days = getWeekDays(weekStart);
          
          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const items = getItemsForDay(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isCurrentDay = isToday(day);
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`
                      border rounded-md p-2 min-h-[80px] 
                      ${isCurrentMonth ? '' : 'opacity-50'} 
                      ${isCurrentDay ? 'border-primary bg-primary/5' : ''}
                    `}
                  >
                    <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                    {items.length > 0 && (
                      <div className="space-y-1">
                        {items.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-xs bg-primary/10 rounded px-1 py-0.5 truncate">
                            {item.listing_name}
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{items.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">{error}</h2>
              <p className="text-sm text-muted-foreground">
                Please contact your host for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todaysCleanings = scheduleItems.filter(item => {
    const checkoutDate = parseISO(item.check_out);
    return isToday(checkoutDate);
  });

  const upcomingCleanings = scheduleItems.filter(item => {
    const checkoutDate = parseISO(item.check_out);
    return checkoutDate > new Date();
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Cleaning Schedule</h1>
          <p className="text-muted-foreground">Welcome, {cleanerName}</p>
        </div>

        {/* Today's Summary */}
        {todaysCleanings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Cleanings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaysCleanings.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{item.listing_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Check-out by {formatTimeDisplay(item.checkout_time)}
                    </div>
                  </div>
                  {item.is_completed && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Schedule Views */}
        <Card>
          <CardHeader>
            <CardTitle>Full Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="mt-4">
                <div className="space-y-3">
                  {upcomingCleanings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No upcoming cleanings scheduled
                    </p>
                  ) : (
                    upcomingCleanings.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{item.listing_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(parseISO(item.check_out), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Check-out by {formatTimeDisplay(item.checkout_time)}
                            </div>
                            {item.guest_name && (
                              <div className="text-sm text-muted-foreground">
                                Guest: {item.guest_name}
                              </div>
                            )}
                          </div>
                          {item.is_completed && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="week" className="mt-4">
                {renderWeekView()}
              </TabsContent>
              
              <TabsContent value="month" className="mt-4">
                {renderMonthView()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}