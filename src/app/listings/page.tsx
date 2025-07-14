
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { mockListings } from '@/data/mock-data';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, ExternalLink, FilePenLine, Trash2, RefreshCcw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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

// Define types for sync status to ensure consistency.
type SyncStatus = 'synced' | 'error' | 'pending';

// Map sync status to corresponding icons for visual representation.
const statusIcons: Record<SyncStatus, React.ReactNode> = {
  synced: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <AlertCircle className="h-4 w-4 text-yellow-500" />,
}

// Map sync status to tooltip text for providing more context to the user.
const statusTooltips: Record<SyncStatus, string> = {
  synced: 'Synced successfully',
  error: 'Sync failed',
  pending: 'Sync pending',
}

// Page for managing all connected listings.
export default function ListingsPage() {
  // TODO: Replace mockListings with data from a database.
  // Add sync status and last sync time to the mock data for UI-only display.
  const [listings, setListings] = useState(mockListings.map(l => ({
    ...l,
    syncStatus: 'synced' as SyncStatus, // TODO: Connect real .ics sync status when backend is ready
    lastSync: 'Jul 15, 10:31 AM', // TODO: This should be a dynamic value.
  })));
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AppLayout>
      {/* Main layout for the listings page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Manage Listings">
           {/* Button to trigger the 'Add New Listing' modal */}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Listing
          </Button>
        </PageHeader>
        
        {/* Table container */}
        <div className="border rounded-xl shadow-sm">
          {/* Reusable Table component for displaying listings */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing Name</TableHead>
                <TableHead>ICS URL</TableHead>
                <TableHead>Assigned Cleaner(s)</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {/* Loop through listings to render table rows */}
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.name}</TableCell>
                    <TableCell>
                      {/* External link to the .ics calendar URL */}
                      <a href={listing.icsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                        <span>Link</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                    <TableCell>
                      {/* Display assigned cleaners using badges */}
                      <div className="flex flex-wrap gap-1">
                        {listing.assignedCleaners.map(cleaner => (
                          <Badge key={cleaner} variant="secondary">{cleaner}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Sync Health Indicator */}
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger>
                            {statusIcons[listing.syncStatus]}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{statusTooltips[listing.syncStatus]}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-muted-foreground text-xs">{listing.lastSync}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2">
                          {/* Manual Refresh Button */}
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  {/* TODO: Implement manual refresh functionality */}
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <RefreshCcw className="h-4 w-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Manual Refresh</p>
                              </TooltipContent>
                          </Tooltip>
                          {/* Actions dropdown for each listing */}
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  {/* Link to the edit page for this listing */}
                                  <DropdownMenuItem asChild>
                                    <Link href={`/listings/${listing.id}/edit`}>
                                      <FilePenLine className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  {/* TODO: Implement delete functionality */}
                                  <DropdownMenuItem className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TooltipProvider>
            </TableBody>
          </Table>
        </div>

        {/* 'Add New Listing' Modal Form */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Listing</DialogTitle>
              <DialogDescription>
                Enter the details for the new listing. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Field for Listing Name with helper text */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Listing Name
                </Label>
                <Input id="name" placeholder="e.g., Unit 2 – Hopper" />
                <p className="text-sm text-muted-foreground">
                  Give this listing a name you recognize. We suggest matching the internal name from your Airbnb calendar so it’s easy to track. This will appear in your cleaning schedule.
                </p>
              </div>
              {/* Field for Airbnb Calendar Link with helper text */}
              <div className="grid gap-2">
                <Label htmlFor="icsUrl">
                  Airbnb Calendar Link (.ics)
                </Label>
                <Input id="icsUrl" placeholder="https://www.airbnb.com/calendar/ical/..." />
                <p className="text-sm text-muted-foreground">
                  Copy the .ics link from Airbnb by selecting ‘Connect another calendar’ and choosing ‘Other website.’ Paste the full URL here to sync your listing’s availability.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              {/* TODO: Implement form submission logic */}
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
