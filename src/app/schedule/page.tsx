'use client';

import React, { useState, useEffect } from 'react';
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
import { Calendar as CalendarIcon, Check, FileDown, Printer, Share, Loader2, Plus, List, CalendarDays, CalendarRange, MoreVertical, UserCheck, Home, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
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
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WeeklyView } from '@/components/schedule/weekly-view';
import { MonthlyView } from '@/components/schedule/monthly-view';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ScheduleStatus = 'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

const statusMap: Record<ScheduleStatus, { text: string, variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
  pending: { text: 'Pending', variant: 'outline', icon: null },
  confirmed: { text: 'Confirmed', variant: 'secondary', icon: null },
  declined: { text: 'Declined', variant: 'destructive', icon: null },
  completed: { text: 'Completed', variant: 'default', icon: <Check className="h-3 w-3" /> },
  cancelled: { text: 'Cancelled', variant: 'destructive', icon: null },
}

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
  manual_rule_frequency?: string;
  feedback_id?: string;
  cleanliness_rating?: 'clean' | 'normal' | 'dirty';
  feedback_notes?: string;
  feedback_completed_at?: string;
}

interface Listing {
  id: string;
  name: string;
  is_active_on_airbnb: boolean;
}

interface Cleaner {
  id: string;
  name: string;
}

// Helper to parse date strings as local dates (avoiding timezone issues)
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS formats
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Validate the date components
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Invalid date string:', dateStr);
    return new Date();
  }
  
  return new Date(year, month - 1, day);
};

// Helper to get timezone abbreviation
const getTimezoneAbbr = (timezone: string): string => {
  const abbreviations: { [key: string]: string } = {
    'America/New_York': 'EST',
    'America/Chicago': 'CST',
    'America/Denver': 'MST',
    'America/Los_Angeles': 'PST',
    'America/Phoenix': 'AZ',
    'Pacific/Honolulu': 'HST',
    'America/Anchorage': 'AKST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Asia/Tokyo': 'JST',
    'Australia/Sydney': 'AEDT'
  };
  return abbreviations[timezone] || timezone.split('/')[1];
};

export default function SchedulePage() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<string>('all');
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [viewType, setViewType] = useState<'list' | 'week' | 'month'>('list');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [manualFormData, setManualFormData] = useState({
    listing_id: '',
    cleaner_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '11:00',
    notes: ''
  });
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    step: 'selectCleaner' as 'selectCleaner' | 'selectType' | 'selectDates' | 'showExport',
    selectedCleanerId: '',
    exportType: 'today' as 'today' | 'range',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    exportText: ''
  });
  const [shareModal, setShareModal] = useState({
    isOpen: false,
    name: '',
    cleanerId: 'all',
    listingIds: [] as string[],
    dateFrom: '',
    dateTo: '',
    expiresInDays: 30,
    isCreating: false,
    shareUrl: ''
  });
  const [dayDetailsModal, setDayDetailsModal] = useState({
    isOpen: false,
    date: new Date(),
    items: [] as ScheduleItem[]
  });
  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    scheduleItem: ScheduleItem | null;
    newCleanerId: string;
  }>({
    isOpen: false,
    scheduleItem: null,
    newCleanerId: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [scheduleRes, cleanersRes, listingsRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/cleaners'),
        fetch('/api/listings')
      ]);

      if (!scheduleRes.ok || !cleanersRes.ok || !listingsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [scheduleData, cleanersData, listingsData] = await Promise.all([
        scheduleRes.json(),
        cleanersRes.json(),
        listingsRes.json()
      ]);

      setScheduleItems(scheduleData);
      setCleaners(cleanersData);
      setListings(listingsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get cleanliness display
  const getCleanlinessDisplay = (rating: string | undefined) => {
    switch (rating) {
      case 'clean':
        return {
          icon: <Sparkles className="h-4 w-4" />,
          color: 'text-green-600',
          label: 'Clean'
        };
      case 'normal':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'text-blue-600',
          label: 'Normal'
        };
      case 'dirty':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-orange-600',
          label: 'Dirty'
        };
      default:
        return null;
    }
  };

  const filteredSchedule = scheduleItems.filter(item => {
    const matchesCleaner = selectedCleaner === 'all' || item.cleaner_id === selectedCleaner;
    
    if (!matchesCleaner) return false;
    
    // Filter by selected listings
    const matchesListing = selectedListings.length === 0 || selectedListings.includes(item.listing_id);
    if (!matchesListing) return false;
    
    // Filter out cancelled bookings unless explicitly showing them
    if (!showCancelled && item.status === 'cancelled') return false;
    
    // Filter out completed/past bookings in list view
    if (item.status === 'completed') return false;
    
    if (!date) return true;
    
    const itemDate = parseLocalDate(item.check_out);
    if (isNaN(itemDate.getTime())) {
      console.error('Invalid checkout date for item:', item);
      return false;
    }
    
    const matchesDate = format(itemDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    return matchesDate;
  });

  // Get items for a specific date
  const getItemsForDate = (targetDate: Date) => {
    return scheduleItems.filter(item => {
      const matchesCleaner = selectedCleaner === 'all' || item.cleaner_id === selectedCleaner;
      if (!matchesCleaner) return false;
      
      // Filter by selected listings
      const matchesListing = selectedListings.length === 0 || selectedListings.includes(item.listing_id);
      if (!matchesListing) return false;
      
      // Filter out cancelled bookings unless explicitly showing them
      if (!showCancelled && item.status === 'cancelled') return false;
      
      const itemDate = parseLocalDate(item.check_out);
      return isSameDay(itemDate, targetDate);
    });
  };

  // Get week days for weekly view
  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  // Get month days for monthly view
  const getMonthDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  // Check if a date has same-day turnaround
  const hasSameDayTurnaround = (date: Date) => {
    const items = getItemsForDate(date);
    return items.some(item => {
      const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id);
      return nextCheckIn === 'Same day';
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    setExportModal({
      ...exportModal,
      isOpen: true,
      step: 'selectCleaner',
      selectedCleanerId: '',
      exportType: 'today',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      exportText: ''
    });
  };

  const handleShowDayDetails = (date: Date) => {
    const items = getItemsForDate(date);
    setDayDetailsModal({
      isOpen: true,
      date,
      items
    });
  };

  const generateExportForCleaner = (cleanerId: string, startDate: Date, endDate: Date) => {
    // Filter schedule items for the selected cleaner and date range
    const cleanerItems = scheduleItems.filter(item => {
      if (item.cleaner_id !== cleanerId) return false;
      const checkoutDate = parseLocalDate(item.check_out);
      const checkoutDateStr = format(checkoutDate, 'yyyy-MM-dd');
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      return checkoutDateStr >= startDateStr && checkoutDateStr <= endDateStr;
    });

    // Group items by date
    const itemsByDate = new Map<string, ScheduleItem[]>();
    cleanerItems.forEach(item => {
      const dateKey = format(parseLocalDate(item.check_out), 'yyyy-MM-dd');
      if (!itemsByDate.has(dateKey)) {
        itemsByDate.set(dateKey, []);
      }
      itemsByDate.get(dateKey)!.push(item);
    });

    // Generate text for each day in range
    let exportText = '';
    
    // Add header with date range for multi-day exports
    if (exportModal.exportType === 'range') {
      exportText += `Schedule for ${format(startDate, 'MMMM d')} - ${format(endDate, 'MMMM d, yyyy')}:\n\n`;
    }
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayItems = itemsByDate.get(dateKey) || [];
      
      if (exportModal.exportType === 'today' && format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
        exportText += `Today's Cleanings - ${format(currentDate, 'MMMM d')}:\n`;
      } else {
        exportText += `${format(currentDate, 'EEEE, MMMM d')}:\n`;
      }
      
      if (dayItems.length === 0) {
        exportText += 'No cleanings scheduled\n';
      } else {
        dayItems.forEach(item => {
          const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id);
          exportText += `${item.listing_name}`;
          
          // Always show next cleaning info
          if (nextCheckIn === 'Same day') {
            exportText += ` - ${nextCheckIn}`;
          } else if (nextCheckIn === 'Next day') {
            exportText += ` - ${nextCheckIn}`;
          } else if (nextCheckIn === 'No upcoming') {
            exportText += ` - No upcoming`;
          } else {
            exportText += ` - Next Cleaning: ${nextCheckIn}`;
          }
          
          exportText += '\n';
        });
      }
      
      exportText += '\n';
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return exportText.trim();
  };

  const handleExportNext = () => {
    if (exportModal.step === 'selectCleaner') {
      if (!exportModal.selectedCleanerId) {
        toast({
          title: 'Error',
          description: 'Please select a cleaner',
          variant: 'destructive',
        });
        return;
      }
      setExportModal({ ...exportModal, step: 'selectType' });
    } else if (exportModal.step === 'selectType') {
      if (exportModal.exportType === 'today') {
        // Generate today's export immediately
        const today = new Date();
        const exportText = generateExportForCleaner(
          exportModal.selectedCleanerId,
          today,
          today
        );
        setExportModal({ ...exportModal, step: 'showExport', exportText });
      } else {
        setExportModal({ ...exportModal, step: 'selectDates' });
      }
    } else if (exportModal.step === 'selectDates') {
      // Generate export for date range
      const exportText = generateExportForCleaner(
        exportModal.selectedCleanerId,
        exportModal.startDate,
        exportModal.endDate
      );
      setExportModal({ ...exportModal, step: 'showExport', exportText });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportModal.exportText);
      toast({
        title: 'Success',
        description: 'Schedule copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    setShareModal({
      isOpen: true,
      name: '',
      cleanerId: selectedCleaner,
      listingIds: [],
      dateFrom: date ? format(date, 'yyyy-MM-dd') : '',
      dateTo: date ? format(date, 'yyyy-MM-dd') : '',
      expiresInDays: 30,
      isCreating: false,
      shareUrl: ''
    });
  };

  const handleCreateShareLink = async () => {
    if (!shareModal.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the share link',
        variant: 'destructive',
      });
      return;
    }

    setShareModal({ ...shareModal, isCreating: true });

    try {
      const payload: any = {
        name: shareModal.name,
        expiresInDays: shareModal.expiresInDays
      };

      if (shareModal.cleanerId !== 'all') {
        payload.cleanerId = shareModal.cleanerId;
      }

      if (shareModal.listingIds.length > 0) {
        payload.listingIds = shareModal.listingIds;
      }

      if (shareModal.dateFrom) {
        payload.dateFrom = shareModal.dateFrom;
      }

      if (shareModal.dateTo) {
        payload.dateTo = shareModal.dateTo;
      }

      const response = await fetch('/api/schedule/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      setShareModal({ ...shareModal, shareUrl: data.shareUrl, isCreating: false });

      toast({
        title: 'Success',
        description: 'Share link created successfully',
      });
    } catch (error) {
      setShareModal({ ...shareModal, isCreating: false });
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive',
      });
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareModal.shareUrl);
      toast({
        title: 'Success',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleCreateManualCleaning = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualFormData.listing_id || !manualFormData.cleaner_id) {
      toast({
        title: 'Error',
        description: 'Please select both a property and cleaner',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/manual-schedules/one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualFormData),
      });

      if (!response.ok) {
        throw new Error('Failed to create manual cleaning');
      }

      toast({
        title: 'Success',
        description: 'Manual cleaning scheduled successfully',
      });

      setIsManualModalOpen(false);
      setManualFormData({
        listing_id: '',
        cleaner_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '11:00',
        notes: ''
      });
      fetchData(); // Refresh the schedule
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create manual cleaning',
        variant: 'destructive',
      });
    }
  };

  // Find the next check-in for a given listing after a checkout date
  const getNextCheckIn = (listingId: string, currentCheckout: string, currentBookingId: string): string => {
    try {
      const checkoutDateObj = parseLocalDate(currentCheckout);
      if (isNaN(checkoutDateObj.getTime())) {
        return 'Invalid date';
      }
      
      const checkoutDateStr = format(checkoutDateObj, 'yyyy-MM-dd');
      
      // Get the current item to check if it's a recurring manual cleaning
      const currentItem = scheduleItems.find(item => item.id === currentBookingId);
      const isRecurring = currentItem?.source === 'manual_recurring';
      
      // Look for a booking that checks in on the same day as this checkout
      const sameDay = scheduleItems.find(item => {
        if (item.listing_id !== listingId || item.id === currentBookingId) return false;
        const checkinDate = parseLocalDate(item.check_in);
        const checkinStr = !isNaN(checkinDate.getTime()) ? format(checkinDate, 'yyyy-MM-dd') : '';
        return checkinStr === checkoutDateStr;
      });
      
      if (sameDay) {
        return 'Same day';
      }
      
      // Find the next booking for this listing (excluding same-day turnarounds already found)
      const futureBookings = scheduleItems
        .filter(item => {
          if (item.listing_id !== listingId || item.id === currentBookingId) return false;
          const checkinDate = parseLocalDate(item.check_in);
          // Check-in must be after or on the checkout date
          return !isNaN(checkinDate.getTime()) && checkinDate >= checkoutDateObj;
        })
        .sort((a, b) => parseLocalDate(a.check_in).getTime() - parseLocalDate(b.check_in).getTime());
      
      if (futureBookings.length > 0) {
        const nextBooking = futureBookings[0];
        const nextCheckin = parseLocalDate(nextBooking.check_in);
        const daysUntil = Math.ceil((nextCheckin.getTime() - checkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        // For recurring manual cleanings, use the manual rule frequency if available
        if (isRecurring && nextBooking.source === 'manual_recurring') {
          // If we have the manual rule frequency, use it
          if (currentItem?.manual_rule_frequency) {
            switch (currentItem.manual_rule_frequency) {
              case 'monthly':
                return 'Monthly';
              case 'weekly':
                return 'Weekly';
              case 'biweekly':
                return 'Biweekly';
              case 'daily':
                return 'Daily';
              default:
                // Fall back to date-based detection
                break;
            }
          }
          
          // Fall back to date-based pattern detection if no rule frequency
          // Check if it's approximately monthly (28-31 days)
          if (daysUntil >= 28 && daysUntil <= 31) {
            return 'Monthly';
          }
          // Check if it's biweekly (14 days)
          else if (daysUntil === 14) {
            return 'Biweekly';
          }
          // Check if it's weekly (7 days)
          else if (daysUntil === 7) {
            return 'Weekly';
          }
        }
        
        if (daysUntil === 0) {
          return 'Same day';
        } else if (daysUntil === 1) {
          return 'Next day';
        } else if (daysUntil === 2) {
          return '2 days later';
        } else if (daysUntil === 3) {
          return '3 days later';
        } else if (daysUntil === 4) {
          return '4 days later';
        } else if (daysUntil === 5) {
          return '5 days later';
        } else if (daysUntil === 6) {
          return '6 days later';
        } else if (daysUntil === 7) {
          return '1 week later';
        } else if (daysUntil <= 14) {
          return `${daysUntil} days later`;
        } else if (daysUntil >= 28 && daysUntil <= 31) {
          return '~1 month later';
        } else {
          return format(nextCheckin, 'MMM d');
        }
      }
      
      // For recurring cleanings with no future bookings, indicate the pattern
      if (isRecurring) {
        return 'Recurring';
      }
      
      return 'No upcoming';
    } catch (error) {
      console.error('Error in getNextCheckIn:', error, { listingId, currentCheckout });
      return 'Error';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <PageHeader title="Cleaning Schedule">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsManualModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Cleaning
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </PageHeader>
        
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'list' | 'week' | 'month')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-2">
                <CalendarRange className="h-4 w-4" />
                Month
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Cleaners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cleaners</SelectItem>
                  {cleaners.map((cleaner) => (
                    <SelectItem key={cleaner.id} value={cleaner.id}>
                      {cleaner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-between">
                    {selectedListings.length === 0 
                      ? "All Properties" 
                      : `${selectedListings.length} ${selectedListings.length === 1 ? 'property' : 'properties'}`}
                    <Home className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Filter by Property</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedListings.length === listings.length) {
                            setSelectedListings([]);
                          } else {
                            setSelectedListings(listings.map(l => l.id));
                          }
                        }}
                      >
                        {selectedListings.length === listings.length ? 'Clear All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="border-t pt-3 space-y-2 max-h-[300px] overflow-y-auto">
                      {listings.map((listing) => (
                        <label
                          key={listing.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                        >
                          <Checkbox
                            checked={selectedListings.includes(listing.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedListings([...selectedListings, listing.id]);
                              } else {
                                setSelectedListings(selectedListings.filter(id => id !== listing.id));
                              }
                            }}
                          />
                          <span className="text-sm flex-1">
                            {listing.name}
                            {!listing.is_active_on_airbnb && (
                              <Badge variant="secondary" className="ml-2 text-xs">Manual</Badge>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="show-cancelled" 
                  checked={showCancelled} 
                  onCheckedChange={(checked) => setShowCancelled(checked as boolean)}
                />
                <Label htmlFor="show-cancelled" className="text-sm font-normal cursor-pointer">
                  Show cancelled
                </Label>
              </div>
              
              {viewType === 'list' && (
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
              )}
            </div>
          </div>

          {/* Legend for visual indicators */}
          {(viewType === 'week' || viewType === 'month') && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-gray-50 rounded-lg p-2 mb-4">
              <span className="font-medium">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Regular</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>Same-day turnaround</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>Extended stay</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>Cancelled</span>
              </div>
            </div>
          )}

          <TabsContent value="list" className="mt-0">
            <div className="border rounded-xl shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checkout Date</TableHead>
                    <TableHead>Next Check-in</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Cleaner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedule.map((item) => {
                    const checkoutDate = parseLocalDate(item.check_out);
                    const isValidDate = !isNaN(checkoutDate.getTime());
                    
                    return (
                    <TableRow key={item.id} className={cn(
                      item.status === 'cancelled' && "opacity-60"
                    )}>
                      <TableCell className="font-medium">
                        {isValidDate ? format(checkoutDate, 'MMM d, yyyy') : 'Invalid date'}
                        <span className="text-sm text-muted-foreground block">
                          {item.checkout_time || '11:00 AM'}
                          {item.listing_timezone && item.listing_timezone !== 'America/New_York' && (
                            <span className="text-xs ml-1">({getTimezoneAbbr(item.listing_timezone)})</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          getNextCheckIn(item.listing_id, item.check_out, item.id) === 'Same day' && "text-orange-600 font-semibold",
                          getNextCheckIn(item.listing_id, item.check_out, item.id) === 'Next day' && "text-yellow-600 font-semibold",
                          ['2 days later', '3 days later'].includes(getNextCheckIn(item.listing_id, item.check_out, item.id)) && "text-blue-600"
                        )}>
                          {getNextCheckIn(item.listing_id, item.check_out, item.id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {item.listing_name}
                            {item.source === 'manual' && (
                              <Badge variant="secondary" className="text-xs">Manual</Badge>
                            )}
                            {item.source === 'manual_recurring' && (
                              <Badge variant="secondary" className="text-xs">Recurring</Badge>
                            )}
                            {item.is_extended && (
                              <Badge variant="outline" className="text-xs">Extended</Badge>
                            )}
                          </div>
                          {item.is_extended && item.extension_notes && (
                            <span className="text-xs text-muted-foreground">{item.extension_notes}</span>
                          )}
                          {item.cancelled_at && (
                            <span className="text-xs text-destructive">
                              Cancelled on {format(parseISO(item.cancelled_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.cleaner_name}
                        {item.cleaner_phone && (
                          <span className="text-sm text-muted-foreground block">
                            {item.cleaner_phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[item.status as ScheduleStatus]?.variant || 'outline'} className="gap-1 items-center">
                          {statusMap[item.status as ScheduleStatus]?.icon}
                          {statusMap[item.status as ScheduleStatus]?.text || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.feedback_completed_at ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const cleanlinessInfo = getCleanlinessDisplay(item.cleanliness_rating);
                              return cleanlinessInfo ? (
                                <div className="group relative">
                                  <div className={cn("flex items-center gap-1", cleanlinessInfo.color)}>
                                    {cleanlinessInfo.icon}
                                    <span className="text-sm font-medium">{cleanlinessInfo.label}</span>
                                  </div>
                                  {item.feedback_notes && (
                                    <div className="absolute z-10 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg -top-2 -translate-y-full left-0">
                                      {item.feedback_notes}
                                    </div>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {['pending', 'confirmed'].includes(item.status) && new Date(item.check_in) > new Date() && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setReassignModal({
                                  isOpen: true,
                                  scheduleItem: item,
                                  newCleanerId: item.cleaner_id
                                })}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reassign Cleaner
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-0">
            <WeeklyView
              weekDays={getWeekDays()}
              getItemsForDate={getItemsForDate}
              hasSameDayTurnaround={hasSameDayTurnaround}
              currentWeek={currentWeek}
              setCurrentWeek={setCurrentWeek}
              onDateClick={handleShowDayDetails}
            />
          </TabsContent>

          <TabsContent value="month" className="mt-0 overflow-visible">
            <div className="overflow-visible">
              <MonthlyView
                getItemsForDate={getItemsForDate}
                hasSameDayTurnaround={hasSameDayTurnaround}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                onDateClick={handleShowDayDetails}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Manual Cleaning Modal */}
        <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
          <DialogContent>
            <form onSubmit={handleCreateManualCleaning}>
              <DialogHeader>
                <DialogTitle>Add Manual Cleaning</DialogTitle>
                <DialogDescription>
                  Schedule a one-time manual cleaning for a property.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="manual-listing">Property</Label>
                  <Select
                    value={manualFormData.listing_id}
                    onValueChange={(value) => setManualFormData({ ...manualFormData, listing_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {listings.map((listing) => (
                        <SelectItem key={listing.id} value={listing.id}>
                          {listing.name}
                          {!listing.is_active_on_airbnb && ' (Manual)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-cleaner">Cleaner</Label>
                  <Select
                    value={manualFormData.cleaner_id}
                    onValueChange={(value) => setManualFormData({ ...manualFormData, cleaner_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cleaner" />
                    </SelectTrigger>
                    <SelectContent>
                      {cleaners.map((cleaner) => (
                        <SelectItem key={cleaner.id} value={cleaner.id}>
                          {cleaner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-date">Date</Label>
                  <Input
                    id="manual-date"
                    type="date"
                    value={manualFormData.date}
                    onChange={(e) => setManualFormData({ ...manualFormData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-time">Time</Label>
                  <Input
                    id="manual-time"
                    type="time"
                    value={manualFormData.time}
                    onChange={(e) => setManualFormData({ ...manualFormData, time: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-notes">Notes</Label>
                  <Textarea
                    id="manual-notes"
                    placeholder="Any special instructions..."
                    value={manualFormData.notes}
                    onChange={(e) => setManualFormData({ ...manualFormData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Cleaning</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Share Modal */}
        <Dialog open={shareModal.isOpen} onOpenChange={(open) => {
          if (!open) {
            setShareModal({ ...shareModal, isOpen: false, shareUrl: '' });
          }
        }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Share Schedule</DialogTitle>
              <DialogDescription>
                {shareModal.shareUrl 
                  ? 'Your share link has been created. Anyone with this link can view the filtered schedule.'
                  : 'Create a shareable link for this schedule. You can optionally filter by cleaner, properties, or date range.'
                }
              </DialogDescription>
            </DialogHeader>

            {!shareModal.shareUrl ? (
              <>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="share-name">Name for this share link</Label>
                    <Input
                      id="share-name"
                      placeholder="e.g., Weekly Schedule for John"
                      value={shareModal.name}
                      onChange={(e) => setShareModal({ ...shareModal, name: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Filter by Cleaner (optional)</Label>
                    <Select
                      value={shareModal.cleanerId}
                      onValueChange={(value) => setShareModal({ ...shareModal, cleanerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cleaners</SelectItem>
                        {cleaners.map((cleaner) => (
                          <SelectItem key={cleaner.id} value={cleaner.id}>
                            {cleaner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Filter by Date Range (optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="From date"
                        value={shareModal.dateFrom}
                        onChange={(e) => setShareModal({ ...shareModal, dateFrom: e.target.value })}
                      />
                      <Input
                        type="date"
                        placeholder="To date"
                        value={shareModal.dateTo}
                        onChange={(e) => setShareModal({ ...shareModal, dateTo: e.target.value })}
                        min={shareModal.dateFrom}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="share-expires">Link expires in</Label>
                    <Select
                      value={shareModal.expiresInDays.toString()}
                      onValueChange={(value) => setShareModal({ ...shareModal, expiresInDays: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShareModal({ ...shareModal, isOpen: false })}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateShareLink}
                    disabled={shareModal.isCreating}
                  >
                    {shareModal.isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Share Link
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="grid gap-4 py-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all">{shareModal.shareUrl}</p>
                  </div>
                  <Button onClick={copyShareLink} variant="secondary">
                    Copy Link
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShareModal({ ...shareModal, isOpen: false })}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Export Modal */}
        <Dialog open={exportModal.isOpen} onOpenChange={(open) => {
          if (!open) {
            setExportModal({ ...exportModal, isOpen: false, step: 'selectCleaner', selectedCleanerId: '', exportText: '' });
          }
        }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Export Schedule</DialogTitle>
              <DialogDescription>
                {exportModal.step === 'selectCleaner' && 'Select a cleaner to export their schedule'}
                {exportModal.step === 'selectType' && 'Choose the export type'}
                {exportModal.step === 'selectDates' && 'Select the date range for the export'}
                {exportModal.step === 'showExport' && 'Copy this schedule to send to the cleaner'}
              </DialogDescription>
            </DialogHeader>

            {exportModal.step === 'selectCleaner' && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Select Cleaner</Label>
                  <Select
                    value={exportModal.selectedCleanerId}
                    onValueChange={(value) => setExportModal({ ...exportModal, selectedCleanerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a cleaner" />
                    </SelectTrigger>
                    <SelectContent>
                      {cleaners.map((cleaner) => (
                        <SelectItem key={cleaner.id} value={cleaner.id}>
                          {cleaner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {exportModal.step === 'selectType' && (
              <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="export-today"
                      name="exportType"
                      value="today"
                      checked={exportModal.exportType === 'today'}
                      onChange={() => setExportModal({ ...exportModal, exportType: 'today' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="export-today" className="font-normal cursor-pointer">
                      Today only
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="export-range"
                      name="exportType"
                      value="range"
                      checked={exportModal.exportType === 'range'}
                      onChange={() => setExportModal({ ...exportModal, exportType: 'range' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="export-range" className="font-normal cursor-pointer">
                      Date range
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {exportModal.step === 'selectDates' && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="export-start-date">Start Date</Label>
                  <Input
                    id="export-start-date"
                    type="date"
                    value={format(exportModal.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setExportModal({ ...exportModal, startDate: parseLocalDate(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="export-end-date">End Date</Label>
                  <Input
                    id="export-end-date"
                    type="date"
                    value={format(exportModal.endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setExportModal({ ...exportModal, endDate: parseLocalDate(e.target.value) })}
                    min={format(exportModal.startDate, 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            )}

            {exportModal.step === 'showExport' && (
              <div className="grid gap-4 py-4">
                <Textarea
                  value={exportModal.exportText}
                  readOnly
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button onClick={copyToClipboard} variant="secondary">
                  Copy to Clipboard
                </Button>
              </div>
            )}

            <DialogFooter>
              {exportModal.step !== 'selectCleaner' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (exportModal.step === 'selectType') {
                      setExportModal({ ...exportModal, step: 'selectCleaner' });
                    } else if (exportModal.step === 'selectDates') {
                      setExportModal({ ...exportModal, step: 'selectType' });
                    } else if (exportModal.step === 'showExport') {
                      setExportModal({ ...exportModal, step: exportModal.exportType === 'today' ? 'selectType' : 'selectDates' });
                    }
                  }}
                >
                  Back
                </Button>
              )}
              {exportModal.step !== 'showExport' && (
                <Button onClick={handleExportNext}>
                  Next
                </Button>
              )}
              {exportModal.step === 'showExport' && (
                <Button onClick={() => setExportModal({ ...exportModal, isOpen: false })}>
                  Done
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Day Details Modal */}
        <Dialog open={dayDetailsModal.isOpen} onOpenChange={(open) => {
          if (!open) {
            setDayDetailsModal({ ...dayDetailsModal, isOpen: false });
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Cleanings for {format(dayDetailsModal.date, 'EEEE, MMMM d, yyyy')}
              </DialogTitle>
              <DialogDescription>
                {dayDetailsModal.items.length === 0
                  ? 'No cleanings scheduled for this day'
                  : `${dayDetailsModal.items.length} cleaning${dayDetailsModal.items.length !== 1 ? 's' : ''} scheduled`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {dayDetailsModal.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No cleanings scheduled for this day
                </p>
              ) : (
                <div className="space-y-3">
                  {dayDetailsModal.items.map((item) => {
                    const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id);
                    return (
                      <div key={item.id} className={cn(
                        "border rounded-lg p-4 space-y-2",
                        item.status === 'cancelled' && "opacity-60 bg-gray-50",
                        item.status === 'completed' && "bg-gray-50"
                      )}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">{item.listing_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Cleaner: {item.cleaner_name}
                              {item.cleaner_phone && ` • ${item.cleaner_phone}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {item.status === 'cancelled' && (
                              <Badge variant="destructive">Cancelled</Badge>
                            )}
                            {item.status === 'completed' && (
                              <Badge variant="secondary">Completed</Badge>
                            )}
                            {item.is_extended && (
                              <Badge variant="outline">Extended</Badge>
                            )}
                            {nextCheckIn === 'Same day' && (
                              <Badge variant="outline" className="border-orange-300 text-orange-600">
                                Same-day turnaround
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Checkout Time</p>
                            <p className="font-medium">{item.checkout_time || '11:00 AM'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Next Check-in</p>
                            <p className="font-medium">{nextCheckIn}</p>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="text-sm">
                            <p className="text-muted-foreground">Notes</p>
                            <p className="whitespace-pre-wrap">{item.notes}</p>
                          </div>
                        )}

                        {item.is_extended && item.extension_notes && (
                          <div className="text-sm">
                            <p className="text-muted-foreground">Extension Details</p>
                            <p className="text-blue-600">{item.extension_notes}</p>
                          </div>
                        )}

                        {item.cancelled_at && (
                          <div className="text-sm">
                            <p className="text-destructive">
                              Cancelled on {format(new Date(item.cancelled_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDayDetailsModal({ ...dayDetailsModal, isOpen: false })}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Cleaner Modal */}
        <Dialog open={reassignModal.isOpen} onOpenChange={(open) => {
          if (!open) {
            setReassignModal({ isOpen: false, scheduleItem: null, newCleanerId: '' });
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign Cleaner</DialogTitle>
              <DialogDescription>
                Change the assigned cleaner for this cleaning task
              </DialogDescription>
            </DialogHeader>

            {reassignModal.scheduleItem && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <p className="font-medium">{reassignModal.scheduleItem.listing_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseLocalDate(reassignModal.scheduleItem.check_out), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current cleaner: {reassignModal.scheduleItem.cleaner_name}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-cleaner">Select New Cleaner</Label>
                  <Select 
                    value={reassignModal.newCleanerId} 
                    onValueChange={(value) => setReassignModal({ ...reassignModal, newCleanerId: value })}
                  >
                    <SelectTrigger id="new-cleaner">
                      <SelectValue placeholder="Choose a cleaner" />
                    </SelectTrigger>
                    <SelectContent>
                      {cleaners.map((cleaner) => (
                        <SelectItem key={cleaner.id} value={cleaner.id}>
                          {cleaner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReassignModal({ isOpen: false, scheduleItem: null, newCleanerId: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!reassignModal.scheduleItem || !reassignModal.newCleanerId) return;
                  
                  try {
                    const response = await fetch(`/api/schedule/${reassignModal.scheduleItem.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cleaner_id: reassignModal.newCleanerId })
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to reassign cleaner');
                    }

                    toast({
                      title: "Cleaner reassigned",
                      description: "The cleaning task has been reassigned successfully."
                    });

                    // Refresh the schedule
                    fetchData();
                    setReassignModal({ isOpen: false, scheduleItem: null, newCleanerId: '' });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to reassign cleaner",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!reassignModal.newCleanerId || reassignModal.newCleanerId === reassignModal.scheduleItem?.cleaner_id}
              >
                Reassign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}