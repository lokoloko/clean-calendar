
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
import { mockCleaners } from '@/data/mock-data';
import { MoreHorizontal, Plus, FilePenLine, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout';

// Page for managing the cleaner directory.
export default function CleanersPage() {
  // TODO: Replace mockCleaners with data from a database.
  const [cleaners, setCleaners] = useState(mockCleaners);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AppLayout>
      {/* Main layout for the cleaners page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Cleaner Directory">
          {/* Button to trigger the 'Add Cleaner' modal */}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Cleaner
          </Button>
        </PageHeader>

        {/* Table container */}
        <div className="border rounded-xl shadow-sm">
          {/* Reusable Table component for displaying cleaners */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Listings Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Loop through cleaners to render table rows */}
              {cleaners.map((cleaner) => (
                <TableRow key={cleaner.id}>
                  <TableCell className="font-medium">{cleaner.name}</TableCell>
                  <TableCell>{cleaner.phone}</TableCell>
                  <TableCell>{cleaner.email}</TableCell>
                  <TableCell>{cleaner.listingsAssigned}</TableCell>
                  <TableCell className="text-right">
                    {/* Actions dropdown for each cleaner */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* TODO: Implement edit functionality to open a modal. Link to CleanerProfilePage could also go here. */}
                        <DropdownMenuItem>
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {/* TODO: Implement delete functionality */}
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 'Add Cleaner' Modal Form */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Cleaner</DialogTitle>
              <DialogDescription>
                Enter the details for the new cleaner. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            {/* Form fields for cleaner details */}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" placeholder="e.g. Yolanda Vega" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" placeholder="yolanda@email.com" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" type="tel" placeholder="+1-202-555-0182" className="col-span-3" />
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
