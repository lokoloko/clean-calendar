'use client';

import React from 'react';
import { format, isSameDay, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

interface MonthlyViewProps {
  getItemsForDate: (date: Date) => ScheduleItem[];
  hasSameDayTurnaround: (date: Date) => boolean;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

export function MonthlyView({
  getItemsForDate,
  hasSameDayTurnaround,
  currentMonth,
  setCurrentMonth,
  onDateClick
}: MonthlyViewProps) {
  // Get all days to display in the calendar grid (including days from prev/next months)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
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

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const items = getItemsForDate(day);
          const hasTurnaround = hasSameDayTurnaround(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          
          return (
            <Popover key={day.toISOString()}>
              <PopoverTrigger asChild>
                <div
                  className={cn(
                    "border rounded-lg p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors relative",
                    !isCurrentMonth && "bg-gray-50 text-muted-foreground",
                    isToday(day) && "bg-blue-50 border-blue-300",
                    hasTurnaround && "border-orange-300"
                  )}
                  onClick={() => onDateClick(day)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  
                  {items.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        {items.slice(0, 3).map((_, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              hasTurnaround ? "bg-orange-500" : "bg-blue-500"
                            )}
                          />
                        ))}
                        {items.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{items.length - 3}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {items.length} cleaning{items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverTrigger>
              {items.length > 0 && (
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">
                      {format(day, 'EEEE, MMMM d')}
                    </h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="text-sm border-b pb-2 last:border-0">
                          <div className="font-medium">{item.listing_name}</div>
                          <div className="text-muted-foreground">
                            {item.cleaner_name} • {item.checkout_time || '11:00 AM'}
                          </div>
                          {item.source !== 'airbnb' && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {item.source === 'manual' ? 'Manual' : 'Recurring'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>
    </div>
  );
}