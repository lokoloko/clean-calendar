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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, ExternalLink, FilePenLine, Trash2, RefreshCcw, CheckCircle2, XCircle, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams } from 'next/navigation';

interface Listing {
  id: string;
  name: string;
  ics_url: string;
  cleaning_fee: number;
  timezone: string;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

interface Cleaner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Assignment {
  id: string;
  listing_id: string;
  cleaner_id: string;
  cleaner?: Cleaner;
}

type SortField = 'name' | 'cleaners';
type SortOrder = 'asc' | 'desc';

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [formData, setFormData] = useState({
    name: '',
    ics_url: '',
    cleaning_fee: '',
    cleaner_id: '',
    timezone: 'America/New_York'
  });
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchData();
    
    // Check if there's an import URL from the landing page
    const importUrl = searchParams.get('import');
    if (importUrl) {
      setFormData(prev => ({
        ...prev,
        ics_url: importUrl,
        name: 'My Airbnb Listing' // Default name
      }));
      setIsModalOpen(true);
      toast({
        title: "Calendar URL detected",
        description: "Please enter a name for your listing and set the cleaning fee.",
      });
    }
  }, [searchParams, toast]);

  const fetchData = async () => {
    try {
      const [listingsRes, cleanersRes, assignmentsRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/cleaners'),
        fetch('/api/assignments')
      ]);

      if (!listingsRes.ok || !cleanersRes.ok || !assignmentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [listingsData, cleanersData, assignmentsData] = await Promise.all([
        listingsRes.json(),
        cleanersRes.json(),
        assignmentsRes.json()
      ]);

      setListings(listingsData);
      setCleaners(cleanersData);
      setAssignments(assignmentsData);
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

  const handleSync = async (listingId: string) => {
    setSyncing(listingId);
    try {
      const response = await fetch(`/api/listings/${listingId}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `Synced ${result.itemsCreated} bookings`,
      });

      // Refresh listings to show updated sync time
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync calendar',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      toast({
        title: 'Syncing all calendars...',
        description: 'This may take a few moments',
      });

      const response = await fetch('/api/sync-all', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync calendars');
      }

      const result = await response.json();
      
      toast({
        title: 'All calendars synced',
        description: `Successfully synced ${result.summary.successful} of ${result.summary.total} listings`,
      });

      // Refresh listings to show updated last_sync times
      fetchData();
    } catch (error) {
      toast({
        title: 'Sync all failed',
        description: error instanceof Error ? error.message : 'Failed to sync calendars',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Create listing
      const listingResponse = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          ics_url: formData.ics_url,
          cleaning_fee: parseFloat(formData.cleaning_fee) || 0,
          timezone: formData.timezone,
          is_active_on_airbnb: !!formData.ics_url // If there's an ICS URL, it's an Airbnb listing
        }),
      });

      if (!listingResponse.ok) {
        throw new Error('Failed to create listing');
      }

      const newListing = await listingResponse.json();

      // Create assignment if cleaner selected
      if (formData.cleaner_id) {
        await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: newListing.id,
            cleaner_id: formData.cleaner_id,
          }),
        });
        
        // Automatically sync the calendar after creating listing with cleaner (only for Airbnb listings)
        if (formData.ics_url) {
          toast({
            title: 'Syncing calendar...',
            description: 'Fetching bookings from Airbnb',
          });
          
          try {
            const syncResponse = await fetch(`/api/listings/${newListing.id}/sync`, {
              method: 'POST',
            });
            
            if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            toast({
              title: 'Success',
              description: `Listing created and synced ${syncResult.itemsCreated} bookings`,
            });
          } else {
            toast({
              title: 'Success',
              description: 'Listing created successfully (sync will happen automatically later)',
            });
          }
        } catch (syncError) {
          // Don't fail the whole operation if sync fails
          toast({
            title: 'Success',
            description: 'Listing created successfully (sync will happen automatically later)',
          });
        }
      }
      } else {
        toast({
          title: 'Success',
          description: 'Listing created successfully. Assign a cleaner to enable calendar sync.',
        });
      }

      setIsModalOpen(false);
      setFormData({ name: '', ics_url: '', cleaning_fee: '', cleaner_id: '', timezone: 'America/New_York' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create listing',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete listing');
      }

      toast({
        title: 'Success',
        description: 'Listing deleted successfully',
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    }
  };

  const getAssignedCleaners = (listingId: string) => {
    return assignments
      .filter(a => a.listing_id === listingId)
      .map(a => {
        const cleaner = cleaners.find(c => c.id === a.cleaner_id);
        return cleaner?.name || 'Unknown';
      })
      .join(', ');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedListings = () => {
    const sorted = [...listings].sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortField === 'cleaners') {
        aValue = getAssignedCleaners(a.id).toLowerCase();
        bValue = getAssignedCleaners(b.id).toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 hover:text-foreground transition-colors"
      >
        {children}
        {sortField === field ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronUp className="h-4 w-4 opacity-0" />
        )}
      </button>
    </TableHead>
  );

  const getSyncStatus = (lastSync: string | null): { status: 'synced' | 'error' | 'pending'; icon: React.ReactNode; tooltip: string } => {
    if (!lastSync) {
      return {
        status: 'pending',
        icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        tooltip: 'Never synced'
      };
    }

    const syncDate = new Date(lastSync);
    const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 24) {
      return {
        status: 'synced',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        tooltip: `Synced ${format(syncDate, 'MMM d, h:mm a')}`
      };
    }

    return {
      status: 'error',
      icon: <XCircle className="h-4 w-4 text-destructive" />,
      tooltip: 'Sync overdue'
    };
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
        <PageHeader title="Manage Listings">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncAll}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Sync All
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add New Listing
            </Button>
          </div>
        </PageHeader>
        
        <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
          ℹ️ Calendars are automatically synced daily at 6:00 AM UTC to catch last-minute bookings. You can also sync manually using the buttons below.
        </div>
        
        <div className="border rounded-xl shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name">Listing Name</SortableHeader>
                <TableHead>Type</TableHead>
                <SortableHeader field="cleaners">Assigned Cleaner(s)</SortableHeader>
                <TableHead>Sync Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {getSortedListings().map((listing) => {
                  const syncInfo = getSyncStatus(listing.last_sync);
                  return (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">{listing.name}</TableCell>
                      <TableCell>
                        {listing.is_active_on_airbnb && listing.ics_url ? (
                          <a href={listing.ics_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                            <span>Airbnb</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <Badge variant="secondary">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getAssignedCleaners(listing.id) || (
                          <Badge variant="secondary">No cleaner assigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {listing.is_active_on_airbnb && listing.ics_url ? (
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{syncInfo.icon}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{syncInfo.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {listing.is_active_on_airbnb && listing.ics_url && (
                              <DropdownMenuItem 
                                onClick={() => handleSync(listing.id)}
                                disabled={syncing === listing.id}
                              >
                                {syncing === listing.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCcw className="mr-2 h-4 w-4" />
                                )}
                                Sync Now
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/listings/${listing.id}/edit`}>
                                <FilePenLine className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(listing.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TooltipProvider>
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          // Reset submission state if modal is closed
          if (!open) {
            setIsSubmitting(false);
          }
        }}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Listing</DialogTitle>
                <DialogDescription>
                  Add a new property. Connect your Airbnb calendar for automatic sync or leave it empty for manual scheduling.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Listing Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Beach House - Unit A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ics_url">Calendar URL (.ics) - Optional</Label>
                  <Input
                    id="ics_url"
                    type="url"
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    value={formData.ics_url}
                    onChange={(e) => setFormData({ ...formData, ics_url: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty for manual properties. Find this in your Airbnb listing settings under Calendar.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cleaning_fee">Cleaning Fee</Label>
                  <Input
                    id="cleaning_fee"
                    type="number"
                    step="0.01"
                    placeholder="75.00"
                    value={formData.cleaning_fee}
                    onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="America/Phoenix">Arizona Time</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Select the timezone where your property is located
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cleaner">Assign Cleaner (Optional)</Label>
                  <Select
                    value={formData.cleaner_id}
                    onValueChange={(value) => setFormData({ ...formData, cleaner_id: value })}
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
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add Listing'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}