'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Home, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  LogOut,
  User,
  MapPin,
  Loader2,
  MessageSquare,
  Star,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface CleaningItem {
  id: string;
  checkIn: string;
  checkOut: string;
  checkoutTime: string;
  guestName: string | null;
  notes: string | null;
  status: string;
  source: 'airbnb' | 'manual' | 'manual_recurring';
  listingId: string;
  listingName: string;
  listingTimezone: string;
  isCompleted: boolean;
  feedback?: {
    id: string;
    cleanlinessRating: string;
    notes: string;
    completedAt: string;
  } | null;
  originalCheckIn?: string;
  originalCheckOut?: string;
  cancelledAt?: string;
  isExtended?: boolean;
  extensionNotes?: string;
}

interface CleanerData {
  cleaner: {
    id: string;
    name: string;
    phone: string;
  };
  schedule: CleaningItem[];
}

export default function CleanerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CleanerData | null>(null);
  const [selectedDate, setSelectedDate] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    // Temporary bypass for testing - skip authentication
    fetchSchedule();
  }, [router, selectedDate]);

  const fetchSchedule = async () => {
    // Temporary bypass for testing - use mock token
    const token = 'mock-token';

    try {
      let url = '/api/cleaner/schedule';
      
      if (selectedDate === 'week') {
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 6);
        url += `?dateFrom=${format(today, 'yyyy-MM-dd')}&dateTo=${format(weekEnd, 'yyyy-MM-dd')}`;
      } else if (selectedDate === 'all') {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        url += `?dateFrom=${format(monthAgo, 'yyyy-MM-dd')}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const scheduleData = await response.json();
      setData(scheduleData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
  };

  const handleLogout = () => {
    // Temporary bypass for testing - just show toast
    toast({
      title: 'Logout',
      description: 'Logout disabled for testing',
    });
  };

  const getStatusColor = (item: CleaningItem) => {
    if (item.status === 'cancelled') return 'bg-red-100 text-red-800';
    if (item.isCompleted || item.feedback) return 'bg-green-100 text-green-800';
    if (isSameDay(parseISO(item.checkOut), new Date())) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = (item: CleaningItem) => {
    if (item.status === 'cancelled') return 'Cancelled';
    if (item.isCompleted || item.feedback) return 'Completed';
    if (isSameDay(parseISO(item.checkOut), new Date())) return 'Due Today';
    return 'Scheduled';
  };

  const getTodayStats = () => {
    if (!data) return { total: 0, completed: 0 };
    
    const today = new Date();
    const todayItems = data.schedule.filter(item => 
      isSameDay(parseISO(item.checkOut), today)
    );
    
    return {
      total: todayItems.length,
      completed: todayItems.filter(item => item.isCompleted || item.feedback).length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load schedule</h2>
          <Button onClick={handleRefresh} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const todayStats = getTodayStats();
  const progressPercentage = todayStats.total > 0 ? (todayStats.completed / todayStats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {data.cleaner.name}
                </h1>
                <p className="text-sm text-gray-600">Cleaner Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Today's Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Today's Progress</span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-900">
                {todayStats.completed}/{todayStats.total}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progressPercentage)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setSelectedDate('today')}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors",
              selectedDate === 'today' 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate('week')}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors",
              selectedDate === 'week' 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedDate('all')}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors",
              selectedDate === 'all' 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            All
          </button>
        </div>

        {/* Cleaning List */}
        <div className="space-y-3">
          {data.schedule.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No cleanings scheduled
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedDate === 'today' ? 'You have no cleanings due today' : 'No cleanings in this period'}
                </p>
              </CardContent>
            </Card>
          ) : (
            data.schedule.map((item) => (
              <Card 
                key={item.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  !item.feedback && !item.isCompleted && "ring-2 ring-orange-200 bg-orange-50/30"
                )}
                onClick={() => router.push(`/cleaner/cleaning/${item.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.listingName}
                        </h3>
                        {!item.feedback && !item.isCompleted && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(parseISO(item.checkOut), 'MMM d, yyyy')} at {item.checkoutTime || '11:00 AM'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", getStatusColor(item))}>
                        {getStatusText(item)}
                      </Badge>
                      {item.isExtended && (
                        <Badge variant="outline" className="text-xs">
                          Extended
                        </Badge>
                      )}
                    </div>
                  </div>

                  {item.guestName && (
                    <div className="text-sm text-gray-600 mb-2">
                      Guest: {item.guestName}
                    </div>
                  )}
                  {item.isExtended && item.extensionNotes && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {item.extensionNotes}
                    </div>
                  )}

                  {item.feedback ? (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-green-600">
                          <Star className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">
                            {item.feedback.cleanlinessRating.charAt(0).toUpperCase() + item.feedback.cleanlinessRating.slice(1)}
                          </span>
                        </div>
                        {item.feedback.notes && (
                          <div className="flex items-center text-blue-600">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            <span className="text-xs">Notes added</span>
                          </div>
                        )}
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-orange-600">
                          <Star className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Rate cleanliness</span>
                        </div>
                        <div className="flex items-center text-blue-600">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span className="text-xs">Add notes</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  )}

                  {item.source !== 'airbnb' && (
                    <Badge variant="secondary" className="text-xs mt-2">
                      {item.source === 'manual' ? 'Manual' : 'Recurring'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}