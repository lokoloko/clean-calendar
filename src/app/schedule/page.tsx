
'use client';

import React, { useState } from 'react';
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
import { mockSchedule, mockCleaners } from '@/data/mock-data';
import { Calendar as CalendarIcon, Check, FileDown, Printer, Share, ThumbsDown, ThumbsUp, X } from 'lucide-react';
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
import { AppLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';

// Define types for schedule status to ensure consistency.
type ScheduleStatus = 'pending' | 'confirmed' | 'declined' | 'completed';

// Map schedule status to corresponding UI elements (text, variant, icon).
const statusMap: Record<ScheduleStatus, { text: string, variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
  pending: { text: 'Pending', variant: 'outline', icon: null },
  confirmed: { text: 'Confirmed', variant: 'secondary', icon: <ThumbsUp className="h-3 w-3" /> },
  declined: { text: 'Declined', variant: 'destructive', icon: <ThumbsDown className="h-3 w-3" /> },
  completed: { text: 'Completed', variant: 'default', icon: <Check className="h-3 w-3" /> },
}

// Page for viewing the cleaning schedule.
export default function SchedulePage() {
  // TODO: Replace mockSchedule with data from a database or a schedule generation service.
  const [schedule, setSchedule] = useState(mockSchedule.map(item => ({...item, status: 'pending' as ScheduleStatus})));
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <AppLayout>
      {/* Main layout for the schedule page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Cleaning Schedule">
          {/* Action buttons for exporting and sharing the schedule */}
          <div className="flex items-center gap-2">
            {/* TODO: Implement print functionality */}
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {/* TODO: Implement export functionality (e.g., to CSV or PDF) */}
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            {/* TODO: Implement share link functionality */}
            <Button>
              <Share className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </PageHeader>
        {/* Filter controls for the schedule view */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Filter by cleaner */}
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Cleaners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cleaners</SelectItem>
                {/* Loop to render all cleaners as dropdown options */}
                {mockCleaners.map((cleaner) => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Date picker for filtering by date */}
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
        {/* Table container */}
        <div className="border rounded-xl shadow-sm">
          {/* Reusable Table component for displaying the schedule */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Loop through schedule items to render table rows */}
              {schedule.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.date}</TableCell>
                  <TableCell>{item.property}</TableCell>
                  <TableCell>{item.cleaner}</TableCell>
                  <TableCell>
                      {/* Badge to show the status of the cleaning task */}
                      <Badge variant={statusMap[item.status].variant} className="gap-1 items-center">
                        {statusMap[item.status].icon}
                        {statusMap[item.status].text}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Cleaner Task Confirmation Actions */}
                    <div className="flex items-center justify-end gap-2">
                      {/* TODO: Implement confirm task functionality */}
                      <Button variant="ghost" size="sm" className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50">
                        <ThumbsUp className="h-4 w-4" /> Confirm
                      </Button>
                      {/* TODO: Implement decline task functionality */}
                       <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <ThumbsDown className="h-4 w-4" /> Decline
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
