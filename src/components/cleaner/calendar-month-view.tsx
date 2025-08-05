'use client';

import React, { useState } from 'react';
import { 
  format, 
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

interface CalendarMonthViewProps {
  schedule: ScheduleItem[];
  onItemClick: (id: string) => void;
}

export function CalendarMonthView({ schedule, onItemClick }: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getItemsForDate = (date: Date) => {
    return schedule.filter(item => 
      isSameDay(parseISO(item.checkOut), date)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' 
      ? subMonths(currentMonth, 1) 
      : addMonths(currentMonth, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    const items = getItemsForDate(date);
    if (items.length > 0) {
      setSelectedDate(date);
      setSheetOpen(true);
    }
  };

  const selectedDateItems = selectedDate ? getItemsForDate(selectedDate) : [];

  return (
    <div className="px-4 py-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="min-h-touch min-w-touch"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="min-h-touch min-w-touch"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-xs font-medium text-gray-600 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const items = getItemsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const dayIsToday = isToday(day);
            const hasCleanings = items.length > 0;
            const hasIncomplete = items.some(item => !item.feedback && !item.isCompleted);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[60px] p-1 border-b border-r relative",
                  index % 7 === 0 && "border-l",
                  !isCurrentMonth && "bg-gray-50",
                  hasCleanings && "cursor-pointer hover:bg-gray-50"
                )}
                onClick={() => handleDateClick(day)}
              >
                <div className={cn(
                  "text-sm font-medium mb-1 px-1",
                  !isCurrentMonth && "text-gray-400",
                  dayIsToday && "text-blue-600"
                )}>
                  {format(day, 'd')}
                </div>
                
                {hasCleanings && (
                  <div className="px-1">
                    <Badge 
                      variant={hasIncomplete && dayIsToday ? "destructive" : "secondary"}
                      className="text-xs w-full justify-center"
                    >
                      {items.length}
                    </Badge>
                    {hasIncomplete && dayIsToday && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse absolute top-1 right-1"></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total this month:</span>
          <Badge variant="secondary">
            {schedule.filter(item => {
              const checkOut = parseISO(item.checkOut);
              return checkOut >= monthStart && checkOut <= monthEnd;
            }).length} cleanings
          </Badge>
        </div>
      </div>

      {/* Day Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[60vh]">
            {selectedDateItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setSheetOpen(false);
                  onItemClick(item.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{item.listingName}</h4>
                    <p className="text-sm text-gray-600">
                      {item.checkoutTime || '11:00 AM'}
                    </p>
                    {item.guestName && (
                      <p className="text-sm text-gray-600">
                        Guest: {item.guestName}
                      </p>
                    )}
                    <Badge 
                      variant={item.feedback ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {item.feedback ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}