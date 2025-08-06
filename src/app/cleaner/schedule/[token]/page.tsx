'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@gostudiom/ui';
import { Calendar, Clock, Home, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@gostudiom/ui';
import { Badge } from '@gostudiom/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gostudiom/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@gostudiom/ui';
import { Textarea } from '@gostudiom/ui';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths, isToday, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/format-utils';
import { getNextCheckIn } from '@/lib/schedule-export';

interface ScheduleItem {
  id: string;
  listing_id: string;
  listing_name: string;
  listing_address?: string;
  host_name?: string;
  cleaner_id: string;
  cleaner_name: string;
  check_in: string;
  check_out: string;
  checkout_time: string;
  guest_name?: string;
  status: string;
  is_completed: boolean;
  feedback_id?: string;
  cleanliness_rating?: string;
  source?: string;
  manual_rule_frequency?: string;
}

export default function CleanerShareSchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanerName, setCleanerName] = useState<string>('');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [token, setToken] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [dayDetailsModal, setDayDetailsModal] = useState({
    isOpen: false,
    date: new Date(),
    items: [] as ScheduleItem[]
  });
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    item: null as ScheduleItem | null,
    cleanlinessRating: '',
    notes: '',
    submitting: false
  });
  const { toast } = useToast();

  useEffect(() => {
    params.then((p) => {
      setToken(p.token);
    });
  }, [params]);

  useEffect(() => {
    if (token) {
      fetchSchedule();
    }
  }, [token]);

  // Auto-refresh every 30 seconds when page is visible
  useEffect(() => {
    if (!token) return;

    // Function to check if page is visible and refresh
    const autoRefresh = () => {
      if (!document.hidden) {
        fetchSchedule();
      }
    };

    // Set up interval for auto-refresh (30 seconds)
    const interval = setInterval(autoRefresh, 30000);

    // Also refresh when page becomes visible after being hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchSchedule();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(`/api/cleaner/schedule/${token}`);
      
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
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackModal.cleanlinessRating) {
      toast({
        title: 'Rating required',
        description: 'Please select a cleanliness rating',
        variant: 'destructive',
      });
      return;
    }

    setFeedbackModal({ ...feedbackModal, submitting: true });

    try {
      const response = await fetch(`/api/cleaner/schedule/${token}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleItemId: feedbackModal.item?.id,
          cleanlinessRating: feedbackModal.cleanlinessRating,
          notes: feedbackModal.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback!',
      });

      // Refresh the schedule to show updated status
      await fetchSchedule();
      
      // Close the modal
      setFeedbackModal({
        isOpen: false,
        item: null,
        cleanlinessRating: '',
        notes: '',
        submitting: false
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
      setFeedbackModal({ ...feedbackModal, submitting: false });
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
                    {items.map((item) => {
                      const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id, scheduleItems);
                      return (
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
                              <div className="text-sm font-medium text-muted-foreground">
                                Next: {nextCheckIn}
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
                      );
                    })}
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
                      ${items.length > 0 ? 'cursor-pointer hover:bg-muted/50' : ''}
                    `}
                    onClick={() => {
                      if (items.length > 0) {
                        setDayDetailsModal({
                          isOpen: true,
                          date: day,
                          items
                        });
                      }
                    }}
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
      <div className="max-w-4xl mx-auto sm:p-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="p-4 sm:p-0 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Cleaning Schedule</h1>
              <p className="text-muted-foreground">Welcome, {cleanerName}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Auto-refreshes
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh now"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {lastRefresh && (
                <span className="text-[10px] text-muted-foreground">
                  Updated {format(lastRefresh, 'h:mm a')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        {todaysCleanings.length > 0 && (
          <Card className="mx-4 sm:mx-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Cleanings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaysCleanings.map((item) => {
                const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id, scheduleItems);
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (!item.is_completed) {
                        setFeedbackModal({
                          isOpen: true,
                          item,
                          cleanlinessRating: '',
                          notes: '',
                          submitting: false
                        });
                      }
                    }}
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{item.listing_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Check-out by {formatTimeDisplay(item.checkout_time)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Next: {nextCheckIn}
                      </div>
                      {!item.is_completed && (
                        <div className="text-xs text-primary">
                          Tap to provide feedback
                        </div>
                      )}
                    </div>
                    {item.is_completed && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Schedule Views */}
        <Card className="sm:mx-0 sm:rounded-lg rounded-none">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Full Schedule</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
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
                    upcomingCleanings.map((item) => {
                      const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id, scheduleItems);
                      return (
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
                              <div className="text-sm font-medium text-muted-foreground">
                                Next: {nextCheckIn}
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
                      );
                    })
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

      {/* Day Details Modal */}
      <Dialog open={dayDetailsModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          setDayDetailsModal({ ...dayDetailsModal, isOpen: false });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cleanings for {format(dayDetailsModal.date, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              {dayDetailsModal.items.length === 0
                ? 'No cleanings scheduled for this day'
                : `${dayDetailsModal.items.length} cleaning${dayDetailsModal.items.length !== 1 ? 's' : ''} scheduled`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {dayDetailsModal.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No cleanings scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {dayDetailsModal.items.map((item) => {
                  const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id, scheduleItems);
                  return (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{item.listing_name}</h4>
                          {item.listing_address && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <Home className="h-3 w-3 inline mr-1" />
                              {item.listing_address}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {item.is_completed && (
                            <Badge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {nextCheckIn === 'Same day' && (
                            <Badge variant="outline" className="border-orange-300 text-orange-600">
                              Same-day turnaround
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Check-out: {formatTimeDisplay(item.checkout_time)}</span>
                        </div>
                        {item.guest_name && (
                          <div>Guest: {item.guest_name}</div>
                        )}
                      </div>
                      
                      {nextCheckIn && (
                        <div className="text-sm">
                          <span className="font-medium">Next: </span>
                          <span className="text-muted-foreground">{nextCheckIn}</span>
                        </div>
                      )}
                      
                      {item.cleanliness_rating && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Last rating:</span>
                          <Badge variant={
                            item.cleanliness_rating === 'clean' ? 'default' :
                            item.cleanliness_rating === 'normal' ? 'secondary' :
                            'destructive'
                          }>
                            {item.cleanliness_rating === 'clean' ? '😊 Clean' :
                             item.cleanliness_rating === 'normal' ? '😐 Normal' :
                             '😟 Dirty'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={feedbackModal.isOpen} onOpenChange={(open) => {
        if (!open && !feedbackModal.submitting) {
          setFeedbackModal({
            isOpen: false,
            item: null,
            cleanlinessRating: '',
            notes: '',
            submitting: false
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provide Cleaning Feedback</DialogTitle>
            <DialogDescription>
              {feedbackModal.item?.listing_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Property Details */}
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="font-medium">{feedbackModal.item?.listing_name}</div>
              {feedbackModal.item?.listing_address && (
                <div className="text-sm text-muted-foreground">
                  <Home className="h-3 w-3 inline mr-1" />
                  {feedbackModal.item.listing_address}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                Check-out by {feedbackModal.item && formatTimeDisplay(feedbackModal.item.checkout_time)}
              </div>
            </div>

            {/* Cleanliness Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                How was the property condition? *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={feedbackModal.cleanlinessRating === 'clean' ? 'default' : 'outline'}
                  onClick={() => setFeedbackModal({ ...feedbackModal, cleanlinessRating: 'clean' })}
                  disabled={feedbackModal.submitting}
                  className="h-12"
                >
                  <span className="text-lg mr-2">😊</span>
                  Clean
                </Button>
                <Button
                  type="button"
                  variant={feedbackModal.cleanlinessRating === 'normal' ? 'default' : 'outline'}
                  onClick={() => setFeedbackModal({ ...feedbackModal, cleanlinessRating: 'normal' })}
                  disabled={feedbackModal.submitting}
                  className="h-12"
                >
                  <span className="text-lg mr-2">😐</span>
                  Normal
                </Button>
                <Button
                  type="button"
                  variant={feedbackModal.cleanlinessRating === 'dirty' ? 'default' : 'outline'}
                  onClick={() => setFeedbackModal({ ...feedbackModal, cleanlinessRating: 'dirty' })}
                  disabled={feedbackModal.submitting}
                  className="h-12"
                >
                  <span className="text-lg mr-2">😟</span>
                  Dirty
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional notes (optional)
              </label>
              <Textarea
                placeholder="Any special conditions or issues to note..."
                value={feedbackModal.notes}
                onChange={(e) => setFeedbackModal({ ...feedbackModal, notes: e.target.value })}
                disabled={feedbackModal.submitting}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitFeedback}
              disabled={feedbackModal.submitting || !feedbackModal.cleanlinessRating}
              className="w-full h-12"
            >
              {feedbackModal.submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}