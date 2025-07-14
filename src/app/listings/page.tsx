
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

type SyncStatus = 'synced' | 'error' | 'pending';

const statusIcons: Record<SyncStatus, React.ReactNode> = {
  synced: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <AlertCircle className="h-4 w-4 text-yellow-500" />,
}

const statusTooltips: Record<SyncStatus, string> = {
  synced: 'Synced successfully',
  error: 'Sync failed',
  pending: 'Sync pending',
}


export default function ListingsPage() {
  const [listings, setListings] = useState(mockListings.map(l => ({
    ...l,
    syncStatus: 'synced' as SyncStatus,
    lastSync: 'Jul 15, 10:31 AM',
  })));
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <PageHeader title="Manage Listings">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Listing
          </Button>
        </PageHeader>
        
        <div className="border rounded-xl shadow-sm">
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
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.name}</TableCell>
                    <TableCell>
                      <a href={listing.icsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                        <span>Link</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {listing.assignedCleaners.map(cleaner => (
                          <Badge key={cleaner} variant="secondary">{cleaner}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
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
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <RefreshCcw className="h-4 w-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Manual Refresh</p>
                              </TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                      <FilePenLine className="mr-2 h-4 w-4" />
                                      Edit
                                  </DropdownMenuItem>
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

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Listing</DialogTitle>
              <DialogDescription>
                Enter the details for the new listing. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Listing Name
                </Label>
                <Input id="name" placeholder="e.g., Unit 2 – Hopper" />
                <p className="text-sm text-muted-foreground">
                  Give this listing a name you recognize. We suggest matching the internal name from your Airbnb calendar so it’s easy to track. This will appear in your cleaning schedule.
                </p>
              </div>
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
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
