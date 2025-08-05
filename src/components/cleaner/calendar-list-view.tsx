'use client';

import React from 'react';
import { format, parseISO, isSameDay, isToday } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  Home,
  User,
  CheckCircle2,
  AlertCircle,
  Star,
  MessageSquare,
  ChevronRight
} from 'lucide-react';

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

interface CalendarListViewProps {
  schedule: ScheduleItem[];
  onItemClick: (id: string) => void;
}

export function CalendarListView({ schedule, onItemClick }: CalendarListViewProps) {
  // Group schedule items by date
  const groupedSchedule = schedule.reduce((groups, item) => {
    const date = format(parseISO(item.checkOut), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, ScheduleItem[]>);

  const sortedDates = Object.keys(groupedSchedule).sort();

  const getStatusColor = (item: ScheduleItem) => {
    if (item.status === 'cancelled') return 'bg-red-100 text-red-800';
    if (item.isCompleted || item.feedback) return 'bg-green-100 text-green-800';
    if (isToday(parseISO(item.checkOut))) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = (item: ScheduleItem) => {
    if (item.status === 'cancelled') return 'Cancelled';
    if (item.isCompleted || item.feedback) return 'Completed';
    if (isToday(parseISO(item.checkOut))) return 'Due Today';
    return 'Scheduled';
  };

  if (schedule.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No cleanings scheduled
            </h3>
            <p className="text-sm text-gray-600">
              No cleanings found for the selected period
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {sortedDates.map((date) => {
        const items = groupedSchedule[date];
        const dateObj = parseISO(date);
        const isDateToday = isToday(dateObj);

        return (
          <div key={date}>
            {/* Date Header - Sticky */}
            <div className={cn(
              "sticky top-[165px] z-30 bg-gray-50 px-2 py-2 -mx-4",
              isDateToday && "bg-orange-50"
            )}>
              <h3 className="text-sm font-semibold text-gray-700">
                {isDateToday ? 'Today, ' : ''}
                {format(dateObj, 'EEEE, MMMM d')}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {items.length} cleaning{items.length > 1 ? 's' : ''}
                </Badge>
              </h3>
            </div>

            {/* Cleanings for this date */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all duration-200",
                    "active:scale-[0.98] active:shadow-sm",
                    !item.feedback && !item.isCompleted && isDateToday && "ring-2 ring-orange-200 bg-orange-50/30"
                  )}
                  onClick={() => onItemClick(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Home className="h-4 w-4 text-gray-400" />
                          <h3 className="font-semibold text-gray-900">
                            {item.listingName}
                          </h3>
                          {!item.feedback && !item.isCompleted && isDateToday && (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {item.checkoutTime || '11:00 AM'}
                          </div>
                          {item.guestName && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {item.guestName}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={cn("text-xs", getStatusColor(item))}>
                        {getStatusText(item)}
                      </Badge>
                    </div>

                    {item.notes && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    {item.feedback ? (
                      <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center text-green-600">
                            <Star className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">
                              {item.feedback.cleanlinessRating.charAt(0).toUpperCase() + 
                               item.feedback.cleanlinessRating.slice(1)}
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
                    ) : isDateToday && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-200">
                        <span className="text-sm font-medium text-orange-600">
                          Action needed
                        </span>
                        <ChevronRight className="h-5 w-5 text-orange-600" />
                      </div>
                    )}

                    {item.source !== 'airbnb' && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {item.source === 'manual' ? 'Manual' : 'Recurring'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}