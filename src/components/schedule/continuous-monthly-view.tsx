'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format, isSameDay, isToday, isPast, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
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
  original_check_in?: string;
  original_check_out?: string;
  cancelled_at?: string;
  is_extended?: boolean;
  extension_notes?: string;
  extension_count?: number;
  modification_history?: any[];
}

interface ContinuousMonthlyViewProps {
  getItemsForDate: (date: Date) => ScheduleItem[];
  hasSameDayTurnaround: (date: Date) => boolean;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

export function ContinuousMonthlyView({
  getItemsForDate,
  hasSameDayTurnaround,
  currentMonth,
  setCurrentMonth,
  onDateClick
}: ContinuousMonthlyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([]);
  const [centerMonth, setCenterMonth] = useState(currentMonth);
  
  // Number of months to show before and after the center month
  const MONTHS_BUFFER = 2;
  
  // Initialize visible months
  useEffect(() => {
    const months: Date[] = [];
    for (let i = -MONTHS_BUFFER; i <= MONTHS_BUFFER; i++) {
      months.push(addMonths(centerMonth, i));
    }
    setVisibleMonths(months);
  }, [centerMonth]);
  
  // Scroll to today on initial load
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);
  
  const scrollToMonth = (month: Date) => {
    setCenterMonth(month);
    setCurrentMonth(month);
  };
  
  const scrollToToday = () => {
    const today = new Date();
    setCenterMonth(startOfMonth(today));
    setCurrentMonth(startOfMonth(today));
    setTimeout(() => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  
  const renderMonth = (month: Date, index: number) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return (
      <div key={month.toISOString()} className="mb-8">
        {/* Month Header */}
        <div className="sticky top-0 bg-background z-10 py-2 mb-4 border-b">
          <h3 className="text-lg font-semibold text-center">
            {format(month, 'MMMM yyyy')}
          </h3>
        </div>
        
        {/* Calendar Grid */}
        <div className="px-4">
          {/* Day Headers - only show for first month */}
          {index === 0 && (
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
          )}
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 auto-rows-auto">
            {calendarDays.map((day) => {
              const items = getItemsForDate(day);
              const hasTurnaround = hasSameDayTurnaround(day);
              const isCurrentMonth = isSameMonth(day, month);
              const isPastDate = isPast(startOfDay(day)) && !isToday(day);
              const isTodayDate = isToday(day);
              
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <div
                      ref={isTodayDate ? todayRef : null}
                      className={cn(
                        "border rounded-lg p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors relative",
                        !isCurrentMonth && "bg-gray-50 text-muted-foreground",
                        isPastDate && "bg-gray-100 text-gray-500",
                        isTodayDate && "bg-blue-50 border-orange-500 border-2",
                        hasTurnaround && !isTodayDate && "border-orange-300"
                      )}
                      onClick={() => onDateClick(day)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-sm font-medium">
                          {format(day, 'd')}
                        </div>
                        {isTodayDate && (
                          <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                            TODAY
                          </span>
                        )}
                      </div>
                      
                      {items.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-0.5 flex-wrap">
                            {items.slice(0, 3).map((item, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  item.status === 'cancelled' ? "bg-gray-400" :
                                  item.is_extended ? "bg-purple-500" :
                                  hasTurnaround ? "bg-orange-500" : 
                                  isPastDate ? "bg-gray-400" : "bg-blue-500"
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
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {items.map((item) => (
                            <div key={item.id} className={cn(
                              "text-sm border-b pb-2 last:border-0",
                              item.status === 'cancelled' && "opacity-60"
                            )}>
                              <div className="font-medium flex items-center gap-2">
                                {item.listing_name}
                                {item.status === 'cancelled' && (
                                  <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                                )}
                                {item.is_extended && (
                                  <Badge variant="outline" className="text-xs">Extended</Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground">
                                {item.cleaner_name} • {item.checkout_time || '11:00 AM'}
                              </div>
                              {item.guest_name && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Guest: {item.guest_name}
                                </div>
                              )}
                              {item.source !== 'airbnb' && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {item.source === 'manual' ? 'Manual' : 'Recurring'}
                                </Badge>
                              )}
                              {item.is_extended && item.extension_notes && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {item.extension_notes}
                                </div>
                              )}
                              {item.cancelled_at && (
                                <div className="text-xs text-destructive mt-1">
                                  Cancelled on {format(new Date(item.cancelled_at), 'MMM d')}
                                </div>
                              )}
                              {item.original_check_out && item.original_check_out !== item.check_out && !item.is_extended && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Original checkout: {format(new Date(item.original_check_out), 'MMM d')}
                                </div>
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
      </div>
    );
  };
  
  return (
    <div className="relative">
      {/* Navigation Controls */}
      <div className="sticky top-0 right-0 z-20 flex flex-col gap-2 absolute right-4 top-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrollToMonth(subMonths(centerMonth, 1))}
          className="shadow-md"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={scrollToToday}
          className="shadow-md"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrollToMonth(addMonths(centerMonth, 1))}
          className="shadow-md"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        className="h-[calc(100vh-200px)] overflow-y-auto pr-16"
      >
        {visibleMonths.map((month, index) => renderMonth(month, index))}
      </div>
    </div>
  );
}