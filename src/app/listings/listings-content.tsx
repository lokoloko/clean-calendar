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
  is_active_on_airbnb?: boolean;
}

interface Cleaner {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Assignment {
  id: string;
  listing_id: string;
  cleaner_id: string;
}

type SortField = 'name' | 'cleaners';
type SortOrder = 'asc' | 'desc';

export default function ListingsContent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingListing, setDeletingListing] = useState<Listing | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
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
    const importUrl = searchParams?.get('import');
    if (importUrl) {
      setFormData(prev => ({ ...prev, ics_url: decodeURIComponent(importUrl) }));
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [listingsRes, cleanersRes, assignmentsRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/cleaners'),
        fetch('/api/assignments')
      ]);

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        // Check if response is an error object
        if (data && data.error) {
          console.error('Listings API error:', data.error);
          toast({
            title: 'Error',
            description: data.error.message || 'Failed to load listings',
            variant: 'destructive',
          });
        } else {
          setListings(Array.isArray(data.listings) ? data.listings : Array.isArray(data) ? data : []);
          if (data.subscription) {
            setSubscriptionInfo(data.subscription);
          }
        }
      }

      if (cleanersRes.ok) {
        const data = await cleanersRes.json();
        // Check if response is an error object
        if (data && data.error) {
          console.error('Cleaners API error:', data.error);
          toast({
            title: 'Error',
            description: data.error.message || 'Failed to load cleaners',
            variant: 'destructive',
          });
        } else {
          setCleaners(Array.isArray(data) ? data : []);
        }
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        // Check if response is an error object
        if (data && data.error) {
          console.error('Assignments API error:', data.error);
          toast({
            title: 'Error',
            description: data.error.message || 'Failed to load assignments',
            variant: 'destructive',
          });
        } else {
          setAssignments(Array.isArray(data) ? data : []);
        }
      }
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

  const handleSync = async (listing: Listing) => {
    setSyncing(listing.id);
    try {
      const res = await fetch(`/api/listings/${listing.id}/sync`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Sync completed',
          description: `Synced ${data.itemsCreated} new items, ${data.itemsUpdated} updated`,
        });
        
        // Update the last sync time
        setListings(prev => prev.map(l => 
          l.id === listing.id 
            ? { ...l, last_sync: data.lastSync }
            : l
        ));
      } else {
        const error = await res.json();
        toast({
          title: 'Sync failed',
          description: error.error || 'Failed to sync calendar',
          variant: 'destructive',
        });
      }
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

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cleaning_fee: parseFloat(formData.cleaning_fee) || 0
        })
      });

      if (res.ok) {
        const newListing = await res.json();
        
        // If a cleaner was selected, create the assignment
        if (formData.cleaner_id) {
          await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listing_id: newListing.id,
              cleaner_id: formData.cleaner_id
            })
          });
        }

        // If there's an ICS URL, sync immediately
        if (formData.ics_url) {
          await handleSync(newListing);
        }

        toast({
          title: 'Success',
          description: 'Listing added successfully',
        });
        
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          ics_url: '',
          cleaning_fee: '',
          cleaner_id: '',
          timezone: 'America/New_York'
        });
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to add listing',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add listing',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cleaning_fee: parseFloat(formData.cleaning_fee) || 0
        })
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Listing updated successfully',
        });
        
        setIsEditModalOpen(false);
        setEditingListing(null);
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update listing',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update listing',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!deletingListing) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${deletingListing.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Listing deleted successfully',
        });
        
        setIsDeleteModalOpen(false);
        setDeletingListing(null);
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete listing',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (listing: Listing) => {
    setEditingListing(listing);
    setFormData({
      name: listing.name,
      ics_url: listing.ics_url || '',
      cleaning_fee: listing.cleaning_fee.toString(),
      cleaner_id: '',
      timezone: listing.timezone || 'America/New_York'
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (listing: Listing) => {
    setDeletingListing(listing);
    setIsDeleteModalOpen(true);
  };

  const getAssignedCleaners = (listingId: string) => {
    const assignedCleanerIds = assignments
      .filter(a => a.listing_id === listingId)
      .map(a => a.cleaner_id);
    
    const assignedCleaners = cleaners
      .filter(c => assignedCleanerIds.includes(c.id))
      .map(c => c.name);
    
    return assignedCleaners.length > 0 ? assignedCleaners.join(', ') : 'Unassigned';
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
      let aValue: string = '';
      let bValue: string = '';
      
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <PageHeader title="Listings" />
            {subscriptionInfo && (
              <p className="text-sm text-muted-foreground mt-1">
                {listings.length} of {subscriptionInfo.usage?.listings?.limit === 999 ? 'unlimited' : subscriptionInfo.usage?.listings?.limit} listings
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {subscriptionInfo && listings.length >= subscriptionInfo.usage?.listings?.limit && subscriptionInfo.usage?.listings?.limit !== 999 && (
              <Link href="/billing/upgrade?feature=listings">
                <Button variant="outline">Upgrade for more</Button>
              </Link>
            )}
            <Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="gap-2"
              disabled={subscriptionInfo && listings.length >= subscriptionInfo.usage?.listings?.limit && subscriptionInfo.usage?.listings?.limit !== 999}
            >
              <Plus className="h-4 w-4" />
              Add Listing
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No listings yet. Add your first listing to get started.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Property Name
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead>iCal Sync</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('cleaners')}
                  >
                    <div className="flex items-center gap-1">
                      Assigned Cleaners
                      <SortIcon field="cleaners" />
                    </div>
                  </TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedListings().map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      <Link href={`/listings/${listing.id}`} className="hover:underline">
                        {listing.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {listing.ics_url ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <Badge variant="outline" className="gap-1">
                              {listing.is_active_on_airbnb ? 'Airbnb' : 'iCal'}
                            </Badge>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Not connected</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/listings/${listing.id}/cleaners`} className="hover:underline">
                        {getAssignedCleaners(listing.id)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {listing.last_sync ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-sm text-muted-foreground">
                              {format(new Date(listing.last_sync), 'MMM d, h:mm a')}
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(listing.last_sync), 'MMMM d, yyyy h:mm a')}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {listing.ics_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(listing)}
                            disabled={syncing === listing.id}
                          >
                            {syncing === listing.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(listing)}>
                              <FilePenLine className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {listing.ics_url && (
                              <DropdownMenuItem asChild>
                                <a href={listing.ics_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Calendar
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => openDeleteModal(listing)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add Listing Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Listing</DialogTitle>
              <DialogDescription>
                Add a property and optionally connect it to your Airbnb calendar
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddListing}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Property Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Beach House, Downtown Apartment"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ics-url">Airbnb Calendar URL (Optional)</Label>
                  <Input
                    id="ics-url"
                    type="url"
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    value={formData.ics_url}
                    onChange={(e) => setFormData({ ...formData, ics_url: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Find this in your Airbnb listing settings under "Calendar Sync"
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cleaning-fee">Cleaning Fee ($)</Label>
                  <Input
                    id="cleaning-fee"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cleaning_fee}
                    onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Property Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
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
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Listing'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Listing Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Listing</DialogTitle>
              <DialogDescription>
                Update the listing details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditListing}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Property Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-ics-url">Airbnb Calendar URL</Label>
                  <Input
                    id="edit-ics-url"
                    type="url"
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    value={formData.ics_url}
                    onChange={(e) => setFormData({ ...formData, ics_url: e.target.value })}
                  />
                  {editingListing?.ics_url && formData.ics_url !== editingListing.ics_url && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">Changing the calendar URL will re-sync all bookings</p>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-cleaning-fee">Cleaning Fee ($)</Label>
                  <Input
                    id="edit-cleaning-fee"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cleaning_fee}
                    onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-timezone">Property Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Listing'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Listing</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingListing?.name}"? This will also delete all associated schedule items and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteListing}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Listing Modal - Same as Add but simpler title */}
        <Dialog open={false}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Listing</DialogTitle>
              <DialogDescription>
                Add a new property to manage
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddListing}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-name">Property Name</Label>
                  <Input
                    id="create-name"
                    placeholder="e.g., Beach House"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline">
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