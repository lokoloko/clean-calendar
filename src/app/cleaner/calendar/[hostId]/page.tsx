'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar as CalendarIcon,
  List,
  CalendarDays,
  Filter,
  Loader2,
  RefreshCw,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarListView } from '@/components/cleaner/calendar-list-view';
import { CalendarWeekView } from '@/components/cleaner/calendar-week-view';
import { CalendarMonthView } from '@/components/cleaner/calendar-month-view';

interface Props {
  params: Promise<{
    hostId: string;
  }>;
}

interface Property {
  id: string;
  name: string;
}

interface ScheduleItem {
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
}

export default function CleanerCalendarPage({ params }: Props) {
  const { hostId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('list');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [hostInfo, setHostInfo] = useState<{
    hostName: string;
    companyName?: string;
    cleanerId: string;
  } | null>(null);

  useEffect(() => {
    // Get host info from session storage
    const storedHost = sessionStorage.getItem('selected-host');
    if (storedHost) {
      const host = JSON.parse(storedHost);
      if (host.userId === hostId) {
        setHostInfo({
          hostName: host.hostName,
          companyName: host.companyName,
          cleanerId: host.cleanerId
        });
      }
    }
    
    fetchSchedule();
  }, [hostId, selectedProperty]);

  const fetchSchedule = async () => {
    try {
      const url = new URL(`/api/cleaner/calendar/${hostId}`, window.location.origin);
      if (selectedProperty !== 'all') {
        url.searchParams.append('listingId', selectedProperty);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cleaner-token') || 'mock-token'}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/cleaner');
          return;
        }
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      setSchedule(data.schedule);
      setProperties(data.properties);
      
      // If no host info from session, use API response
      if (!hostInfo && data.hostInfo) {
        setHostInfo(data.hostInfo);
      }
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

  const handleBack = () => {
    router.push('/cleaner/hosts');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const displayName = hostInfo?.companyName || hostInfo?.hostName || 'Schedule';

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="min-h-touch min-w-touch p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {displayName}
                </h1>
                <p className="text-sm text-gray-600">
                  {schedule.length} upcoming cleanings
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="min-h-touch min-w-touch p-2"
            >
              <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b sticky top-[65px] z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all",
                "min-h-touch active:scale-95",
                viewMode === 'list' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-600 hover:text-gray-700"
              )}
            >
              <List className="h-4 w-4 inline-block mr-2" />
              List
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all",
                "min-h-touch active:scale-95",
                viewMode === 'week' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-600 hover:text-gray-700"
              )}
            >
              <CalendarDays className="h-4 w-4 inline-block mr-2" />
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all",
                "min-h-touch active:scale-95",
                viewMode === 'month' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-600 hover:text-gray-700"
              )}
            >
              <CalendarIcon className="h-4 w-4 inline-block mr-2" />
              Month
            </button>
          </div>

          {/* Property Filter */}
          {properties.length > 0 && (
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="max-w-4xl mx-auto">
        {viewMode === 'list' && (
          <CalendarListView 
            schedule={schedule} 
            onItemClick={(id) => router.push(`/cleaner/cleaning/${id}`)}
          />
        )}
        {viewMode === 'week' && (
          <CalendarWeekView 
            schedule={schedule}
            onItemClick={(id) => router.push(`/cleaner/cleaning/${id}`)}
          />
        )}
        {viewMode === 'month' && (
          <CalendarMonthView 
            schedule={schedule}
            onItemClick={(id) => router.push(`/cleaner/cleaning/${id}`)}
          />
        )}
      </div>
    </div>
  );
}