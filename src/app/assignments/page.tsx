
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
import { MoreHorizontal, Plus, Replace, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface Assignment {
  id: string;
  listing_id: string;
  cleaner_id: string;
  listing_name?: string;
  cleaner_name?: string;
  created_at: string;
}

interface Listing {
  id: string;
  name: string;
}

interface Cleaner {
  id: string;
  name: string;
}

// Page for managing cleaner-to-listing assignments.
export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    listing_id: '',
    cleaner_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsRes, listingsRes, cleanersRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/listings'),
        fetch('/api/cleaners')
      ]);

      if (!assignmentsRes.ok || !listingsRes.ok || !cleanersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [assignmentsData, listingsData, cleanersData] = await Promise.all([
        assignmentsRes.json(),
        listingsRes.json(),
        cleanersRes.json()
      ]);

      // Check for error responses
      if (assignmentsData && assignmentsData.error) {
        console.error('Assignments API error:', assignmentsData.error);
        throw new Error(assignmentsData.error.message || 'Failed to load assignments');
      }
      if (listingsData && listingsData.error) {
        console.error('Listings API error:', listingsData.error);
        throw new Error(listingsData.error.message || 'Failed to load listings');
      }
      if (cleanersData && cleanersData.error) {
        console.error('Cleaners API error:', cleanersData.error);
        throw new Error(cleanersData.error.message || 'Failed to load cleaners');
      }

      // Extract data from response wrapper with array validation
      setAssignments(Array.isArray(assignmentsData?.data) ? assignmentsData.data : Array.isArray(assignmentsData) ? assignmentsData : []);
      setListings(Array.isArray(listingsData?.data) ? listingsData.data : Array.isArray(listingsData) ? listingsData : []);
      setCleaners(Array.isArray(cleanersData?.data) ? cleanersData.data : Array.isArray(cleanersData) ? cleanersData : []);
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

  const handleCreateAssignment = async () => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create assignment');

      toast({
        title: 'Success',
        description: 'Assignment created successfully',
      });

      setIsModalOpen(false);
      setFormData({ listing_id: '', cleaner_id: '' });
      fetchData(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete assignment');

      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
      });

      fetchData(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete assignment',
        variant: 'destructive',
      });
    }
  };

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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : !Array.isArray(assignments) || assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No assignments yet. Click "Assign Cleaner to Listing" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.listing_name || 'Unknown Listing'}</TableCell>
                    <TableCell>{assignment.cleaner_name || 'Unknown Cleaner'}</TableCell>
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
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
                <Select value={formData.listing_id} onValueChange={(value) => setFormData({...formData, listing_id: value})}>
                  <SelectTrigger id="listing" className="col-span-3">
                    <SelectValue placeholder="Select a listing" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(listings) && listings.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Cleaner selector dropdown */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cleaner" className="text-right">
                  Cleaner
                </Label>
                <Select value={formData.cleaner_id} onValueChange={(value) => setFormData({...formData, cleaner_id: value})}>
                  <SelectTrigger id="cleaner" className="col-span-3">
                    <SelectValue placeholder="Select a cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(cleaners) && cleaners.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleCreateAssignment} disabled={!formData.listing_id || !formData.cleaner_id}>
                Save assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
