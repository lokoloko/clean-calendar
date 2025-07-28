
'use client';

import React, { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Calendar as CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { type ScheduleItem, type Cleaner, type OptimizedAssignment } from '@/types';
import { optimizeScheduleAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

// Props for the ScheduleClient component.
type ScheduleClientProps = {
  initialSchedule: ScheduleItem[];
  cleaners: Cleaner[];
};

/**
 * A client component for displaying and interacting with the schedule.
 * This component handles state for AI optimization and user interactions.
 * This component is intended to be used within a server component that fetches the initial data.
 */
export function ScheduleClient({ initialSchedule, cleaners }: ScheduleClientProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [optimizedAssignments, setOptimizedAssignments] = useState<OptimizedAssignment[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Handler for the AI optimization flow.
  const handleOptimize = () => {
    startTransition(async () => {
      const result = await optimizeScheduleAction();
      if (result.success && result.data) {
        setOptimizedAssignments(result.data);
        toast({
          title: "Schedule Optimized!",
          description: "AI has generated an optimized schedule.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Optimization Failed",
          description: result.error || "An unknown error occurred.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header Component */}
      <PageHeader title="Generated Schedule">
        {/* Button to trigger the AI schedule optimization */}
        <Button onClick={handleOptimize} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Optimize with AI
        </Button>
      </PageHeader>
      
      {/* Tabs to switch between optimized and weekly schedule views */}
      <Tabs defaultValue="optimized">
        <div className="flex flex-wrap items-center gap-4">
            <TabsList>
                <TabsTrigger value="optimized">Optimized Schedule</TabsTrigger>
                <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Cleaner filter dropdown */}
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Cleaners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cleaners</SelectItem>
                {/* Render all cleaners as dropdown options */}
                {cleaners.map((cleaner) => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[280px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content for the "Optimized Schedule" tab */}
        <TabsContent value="optimized" className="mt-4">
            <Card>
                <CardContent className="p-0">
                  <div className="border-0 rounded-xl">
                      {/* Table for displaying the AI-optimized schedule */}
                      <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>Listing</TableHead>
                          <TableHead>Assigned Cleaner</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>Est. Travel Time</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {optimizedAssignments.length > 0 ? (
                          // Render optimized assignments if available
                          optimizedAssignments.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.listingName}</TableCell>
                                <TableCell>{item.cleanerName}</TableCell>
                                <TableCell>{item.startTime}</TableCell>
                                <TableCell>{item.travelTime}</TableCell>
                              </TableRow>
                          ))
                          ) : (
                          // Show a message if no schedule has been generated
                          <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                              No optimized schedule generated yet. Click "Optimize with AI" to begin.
                              </TableCell>
                          </TableRow>
                          )}
                      </TableBody>
                      </Table>
                  </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* Content for the "Weekly View" tab */}
        <TabsContent value="weekly" className="mt-4">
            <Card>
                <CardContent className="p-0">
                  <div className="border-0 rounded-xl">
                      {/* Table for displaying the initial weekly schedule */}
                      <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Checkout Time</TableHead>
                          <TableHead>Notes</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {/* Render the initial schedule passed via props */}
                          {initialSchedule.map((item) => (
                          <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.date}</TableCell>
                              <TableCell>{item.property}</TableCell>
                              <TableCell>{item.checkoutTime}</TableCell>
                              <TableCell>{item.notes}</TableCell>
                          </TableRow>
                          ))}
                      </TableBody>
                      </Table>
                  </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
