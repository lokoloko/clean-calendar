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
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Loader2, Play, Pause, Trash2, Edit, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AppLayout } from '@/components/layout';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ManualSchedule {
  id: string;
  listing_id: string;
  listing_name: string;
  cleaner_id: string;
  cleaner_name: string;
  schedule_type: 'one_time' | 'recurring';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom' | null;
  days_of_week: number[] | null;
  day_of_month: number | null;
  custom_interval_days: number | null;
  cleaning_time: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function ManualSchedulesPage() {
  const [schedules, setSchedules] = useState<ManualSchedule[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ManualSchedule | null>(null);
  const [originalSchedule, setOriginalSchedule] = useState<ManualSchedule | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    listing_id: '',
    cleaner_id: '',
    schedule_type: 'recurring' as 'one_time' | 'recurring',
    frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom',
    days_of_week: [] as number[],
    day_of_month: 1,
    custom_interval_days: 7,
    cleaning_time: '11:00',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notes: '',
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, listingsRes, cleanersRes] = await Promise.all([
        fetch('/api/manual-schedules'),
        fetch('/api/listings'),
        fetch('/api/cleaners')
      ]);

      if (!schedulesRes.ok || !listingsRes.ok || !cleanersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [schedulesData, listingsData, cleanersData] = await Promise.all([
        schedulesRes.json(),
        listingsRes.json(),
        cleanersRes.json()
      ]);

      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      // Handle listings API response format
      if (listingsData && listingsData.listings) {
        setListings(Array.isArray(listingsData.listings) ? listingsData.listings : []);
      } else {
        setListings(Array.isArray(listingsData) ? listingsData : []);
      }
      setCleaners(Array.isArray(cleanersData) ? cleanersData : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingSchedule 
        ? `/api/manual-schedules/${editingSchedule.id}`
        : '/api/manual-schedules';
      
      const method = editingSchedule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          days_of_week: formData.frequency === 'weekly' || formData.frequency === 'biweekly' 
            ? formData.days_of_week 
            : null,
          day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : null,
          custom_interval_days: formData.frequency === 'custom' ? formData.custom_interval_days : null,
          end_date: formData.end_date || null,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      toast({
        title: 'Success',
        description: editingSchedule ? 'Schedule updated successfully' : 'Schedule created successfully',
      });

      setIsModalOpen(false);
      fetchData();
      
      // If creating new schedule, offer to generate
      if (!editingSchedule) {
        const newSchedule = await response.json();
        if (newSchedule.schedule_type === 'recurring') {
          const shouldGenerate = window.confirm('Would you like to generate schedule items for the next 6 months?');
          if (shouldGenerate) {
            handleGenerate(newSchedule.id);
          }
        }
      } else {
        // Check if critical fields have changed that would affect schedule items
        const hasFrequencyChanged = originalSchedule && (
          originalSchedule.frequency !== formData.frequency ||
          JSON.stringify(originalSchedule.days_of_week) !== JSON.stringify(formData.days_of_week) ||
          originalSchedule.day_of_month !== formData.day_of_month ||
          originalSchedule.custom_interval_days !== formData.custom_interval_days ||
          originalSchedule.start_date.split('T')[0] !== formData.start_date
        );
        
        if (hasFrequencyChanged && formData.schedule_type === 'recurring') {
          const shouldRegenerate = window.confirm(
            'You\'ve changed the schedule pattern. Would you like to regenerate the schedule items?\n\n' +
            'This will:\n' +
            '• Delete all future schedule items for this rule\n' +
            '• Create new items based on the updated pattern\n\n' +
            'Note: Completed or cancelled items will not be affected.'
          );
          if (shouldRegenerate) {
            handleRegenerate(editingSchedule.id);
          }
        }
      }
      
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save schedule',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async (scheduleId: string) => {
    setGeneratingId(scheduleId);
    
    try {
      const response = await fetch(`/api/manual-schedules/${scheduleId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to generate schedule');
      }

      const result = await response.json();
      
      let description = `Generated ${result.created} cleanings`;
      if (result.skipped > 0) {
        description += ` (${result.skipped} already exist)`;
      }
      if (result.conflicts > 0) {
        description += ` (${result.conflicts} conflicts)`;
      }
      
      toast({
        title: result.created > 0 ? 'Success' : 'Info',
        description,
        variant: result.created === 0 && result.total > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate schedule',
        variant: 'destructive',
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRegenerate = async (scheduleId: string) => {
    setGeneratingId(scheduleId);
    
    try {
      const response = await fetch(`/api/manual-schedules/${scheduleId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error('Failed to regenerate schedule');
      }
      const result = await response.json();
      
      let description = `Deleted ${result.deleted} old items and created ${result.created} new cleanings`;
      if (result.conflicts > 0) {
        description += ` (${result.conflicts} conflicts skipped)`;
      }
      
      toast({
        title: 'Schedule Regenerated',
        description,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate schedule',
        variant: 'destructive',
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleToggleActive = async (schedule: ManualSchedule) => {
    try {
      const response = await fetch(`/api/manual-schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schedule,
          is_active: !schedule.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }

      toast({
        title: 'Success',
        description: `Schedule ${schedule.is_active ? 'deactivated' : 'activated'} successfully`,
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm(
      'Are you sure you want to delete this schedule?\n\n' +
      'This will also delete all associated schedule items.'
    )) {
      return;
    }

    try {
      const response = await fetch(`/api/manual-schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      const result = await response.json();
      toast({
        title: 'Success',
        description: `Schedule deleted successfully${result.deletedItems > 0 ? ` (${result.deletedItems} items removed)` : ''}`,
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      listing_id: '',
      cleaner_id: '',
      schedule_type: 'recurring',
      frequency: 'weekly',
      days_of_week: [],
      day_of_month: 1,
      custom_interval_days: 7,
      cleaning_time: '11:00',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      notes: '',
      is_active: true,
    });
    setEditingSchedule(null);
    setOriginalSchedule(null);
  };

  const openEditModal = (schedule: ManualSchedule) => {
    setEditingSchedule(schedule);
    setOriginalSchedule(schedule);
    setFormData({
      listing_id: schedule.listing_id,
      cleaner_id: schedule.cleaner_id,
      schedule_type: schedule.schedule_type,
      frequency: schedule.frequency || 'weekly',
      days_of_week: schedule.days_of_week || [],
      day_of_month: schedule.day_of_month || 1,
      custom_interval_days: schedule.custom_interval_days || 7,
      cleaning_time: schedule.cleaning_time,
      start_date: schedule.start_date.split('T')[0],
      end_date: schedule.end_date ? schedule.end_date.split('T')[0] : '',
      notes: schedule.notes || '',
      is_active: schedule.is_active,
    });
    setIsModalOpen(true);
  };

  const getFrequencyText = (schedule: ManualSchedule) => {
    if (schedule.schedule_type === 'one_time') return 'One-time';
    
    switch (schedule.frequency) {
      case 'daily': return 'Daily';
      case 'weekly': 
        const days = schedule.days_of_week?.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.slice(0, 3)).join(', ');
        return `Weekly (${days})`;
      case 'biweekly':
        const biDays = schedule.days_of_week?.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.slice(0, 3)).join(', ');
        return `Biweekly (${biDays})`;
      case 'monthly': return `Monthly (Day ${schedule.day_of_month})`;
      case 'custom': return `Every ${schedule.custom_interval_days} days`;
      default: return 'Unknown';
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
        <PageHeader title="Manual Cleaning Schedules">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Schedule
          </Button>
        </PageHeader>
        
        <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
          ℹ️ Create recurring cleaning schedules for long-term guests or properties not listed on Airbnb.
        </div>
        
        <div className="border rounded-xl shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.listing_name}</TableCell>
                  <TableCell>{schedule.cleaner_name}</TableCell>
                  <TableCell>{getFrequencyText(schedule)}</TableCell>
                  <TableCell>{schedule.cleaning_time || '11:00 AM'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(schedule.start_date), 'MMM d, yyyy')}
                      {schedule.end_date && (
                        <span className="text-muted-foreground">
                          {' → '}
                          {format(new Date(schedule.end_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {schedule.schedule_type === 'recurring' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerate(schedule.id)}
                            disabled={generatingId === schedule.id}
                            title="Generate new schedule items"
                          >
                            {generatingId === schedule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm(
                                'Are you sure you want to regenerate this schedule?\n\n' +
                                'This will:\n' +
                                '• Delete all future schedule items\n' +
                                '• Create new items based on the current settings\n\n' +
                                'Note: Completed or cancelled items will not be affected.'
                              )) {
                                handleRegenerate(schedule.id);
                              }
                            }}
                            disabled={generatingId === schedule.id}
                            title="Regenerate schedule (delete old, create new)"
                          >
                            {generatingId === schedule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(schedule)}
                      >
                        {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit' : 'Add'} Manual Schedule</DialogTitle>
                <DialogDescription>
                  Create a recurring cleaning schedule for properties with long-term guests.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="listing">Property</Label>
                    <Select
                      value={formData.listing_id}
                      onValueChange={(value) => setFormData({ ...formData, listing_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
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
                    <Label htmlFor="cleaner">Cleaner</Label>
                    <Select
                      value={formData.cleaner_id}
                      onValueChange={(value) => setFormData({ ...formData, cleaner_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cleaner" />
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

                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom Interval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
                  <div className="grid gap-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-4">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={formData.days_of_week.includes(day.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  days_of_week: [...formData.days_of_week, day.value].sort(),
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  days_of_week: formData.days_of_week.filter(d => d !== day.value),
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`day-${day.value}`} className="text-sm">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div className="grid gap-2">
                    <Label htmlFor="day-of-month">Day of Month</Label>
                    <Input
                      id="day-of-month"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                {formData.frequency === 'custom' && (
                  <div className="grid gap-2">
                    <Label htmlFor="custom-interval">Interval (days)</Label>
                    <Input
                      id="custom-interval"
                      type="number"
                      min="1"
                      value={formData.custom_interval_days}
                      onChange={(e) => setFormData({ ...formData, custom_interval_days: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="time">Cleaning Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.cleaning_time}
                      onChange={(e) => setFormData({ ...formData, cleaning_time: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty for ongoing schedules
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Special instructions for this cleaning schedule..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSchedule ? 'Update' : 'Create'} Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}