'use client';

import React from 'react';
import { format, isSameDay, isToday, addWeeks, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface WeeklyViewProps {
  weekDays: Date[];
  getItemsForDate: (date: Date) => ScheduleItem[];
  hasSameDayTurnaround: (date: Date) => boolean;
  currentWeek: Date;
  setCurrentWeek: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

export function WeeklyView({
  weekDays,
  getItemsForDate,
  hasSameDayTurnaround,
  currentWeek,
  setCurrentWeek,
  onDateClick
}: WeeklyViewProps) {
  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const items = getItemsForDate(day);
          const hasTurnaround = hasSameDayTurnaround(day);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border rounded-lg p-3 min-h-[150px] cursor-pointer hover:bg-gray-50 transition-colors",
                isToday(day) && "bg-blue-50 border-blue-300",
                hasTurnaround && "border-orange-300"
              )}
              onClick={() => onDateClick(day)}
            >
              <div className="font-semibold text-sm mb-2">
                {format(day, 'EEE')}
                <span className="text-muted-foreground ml-1">
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No cleanings</p>
                ) : (
                  items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="text-xs p-1 bg-gray-100 rounded"
                    >
                      <div className="font-medium truncate">
                        {item.listing_name}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {item.cleaner_name}
                      </div>
                      {item.source !== 'airbnb' && (
                        <Badge variant="secondary" className="text-xs scale-75 -ml-1">
                          {item.source === 'manual' ? 'M' : 'R'}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
                {items.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{items.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}