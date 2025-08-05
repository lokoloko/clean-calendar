'use client';

import React, { useState } from 'react';
import { 
  format, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

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

interface CalendarWeekViewProps {
  schedule: ScheduleItem[];
  onItemClick: (id: string) => void;
}

export function CalendarWeekView({ schedule, onItemClick }: CalendarWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getItemsForDate = (date: Date) => {
    return schedule.filter(item => 
      isSameDay(parseISO(item.checkOut), date)
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'prev' 
      ? subWeeks(currentWeek, 1) 
      : addWeeks(currentWeek, 1)
    );
  };

  const handleSwipe = (e: React.TouchEvent) => {
    const touchStart = e.changedTouches[0].clientX;
    let touchEnd = touchStart;

    const handleTouchMove = (e: TouchEvent) => {
      touchEnd = e.changedTouches[0].clientX;
    };

    const handleTouchEnd = () => {
      const diff = touchStart - touchEnd;
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          navigateWeek('next');
        } else {
          navigateWeek('prev');
        }
      }
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="px-4 py-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('prev')}
          className="min-h-touch min-w-touch"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <h3 className="text-sm font-semibold text-gray-700">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h3>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('next')}
          className="min-h-touch min-w-touch"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week Grid */}
      <div 
        className="grid grid-cols-7 gap-2"
        onTouchStart={handleSwipe}
      >
        {weekDays.map((day) => {
          const items = getItemsForDate(day);
          const dayIsToday = isToday(day);
          
          return (
            <div key={day.toISOString()} className="space-y-2">
              {/* Day Header */}
              <div className={cn(
                "text-center p-2 rounded-t-lg",
                dayIsToday ? "bg-blue-100" : "bg-gray-100"
              )}>
                <div className="text-xs font-medium text-gray-600">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-semibold",
                  dayIsToday ? "text-blue-700" : "text-gray-900"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
              
              {/* Cleanings */}
              <div className="space-y-1 min-h-[100px]">
                {items.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center p-2">
                    No cleanings
                  </div>
                ) : (
                  items.map((item) => (
                    <Card
                      key={item.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-all p-2",
                        "active:scale-[0.98]",
                        !item.feedback && !item.isCompleted && dayIsToday && 
                        "ring-1 ring-orange-200 bg-orange-50/50"
                      )}
                      onClick={() => onItemClick(item.id)}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-900 line-clamp-1">
                          {item.listingName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.checkoutTime || '11:00 AM'}
                        </div>
                        {item.feedback && (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        )}
                        {!item.feedback && !item.isCompleted && dayIsToday && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mx-auto"></div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week Summary */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total this week:</span>
          <Badge variant="secondary">
            {schedule.filter(item => {
              const checkOut = parseISO(item.checkOut);
              return checkOut >= weekStart && checkOut <= weekEnd;
            }).length} cleanings
          </Badge>
        </div>
      </div>
    </div>
  );
}