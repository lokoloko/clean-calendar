
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
import { mockAssignments, mockListings, mockCleaners } from '@/data/mock-data';
import { MoreHorizontal, Plus, Replace, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout';

// Page for managing cleaner-to-listing assignments.
export default function AssignmentsPage() {
  // TODO: Replace mockAssignments with data from a database.
  const [assignments, setAssignments] = useState(mockAssignments);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AppLayout>
      {/* Main layout for the assignments page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Listing-to-Cleaner Assignments">
          {/* Button to trigger the 'Assign Cleaner' modal */}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Assign Cleaner to Listing
          </Button>
        </PageHeader>

        {/* Table container */}
        <div className="border rounded-xl shadow-sm">
          {/* Reusable Table component for displaying assignments */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Loop through assignments to render table rows */}
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.listingName}</TableCell>
                  <TableCell>{assignment.cleanerName}</TableCell>
                  <TableCell className="text-right">
                    {/* Actions dropdown for each assignment */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* TODO: Implement change functionality */}
                        <DropdownMenuItem>
                          <Replace className="mr-2 h-4 w-4" />
                          Change
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

        {/* 'Assign Cleaner' Modal Form */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Cleaner</DialogTitle>
              <DialogDescription>
                Select a listing and a cleaner to create a new assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Listing selector dropdown */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="listing" className="text-right">
                  Listing
                </Label>
                {/* TODO: Replace mockListings with dynamic data */}
                <Select>
                  <SelectTrigger id="listing" className="col-span-3">
                    <SelectValue placeholder="Select a listing" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockListings.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Cleaner selector dropdown */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cleaner" className="text-right">
                  Cleaner
                </Label>
                {/* TODO: Replace mockCleaners with dynamic data */}
                <Select>
                  <SelectTrigger id="cleaner" className="col-span-3">
                    <SelectValue placeholder="Select a cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCleaners.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              {/* TODO: Implement form submission logic */}
              <Button type="submit">Save assignment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
