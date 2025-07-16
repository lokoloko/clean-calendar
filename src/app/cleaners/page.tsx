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
import { MoreHorizontal, Plus, Phone, Mail, FilePenLine, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Cleaner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface Assignment {
  id: string;
  listing_id: string;
  cleaner_id: string;
  listing_name: string;
  cleaner_name: string;
}

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cleanersRes, assignmentsRes] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/assignments')
      ]);

      if (!cleanersRes.ok || !assignmentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [cleanersData, assignmentsData] = await Promise.all([
        cleanersRes.json(),
        assignmentsRes.json()
      ]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCleaner) {
        // Update existing cleaner
        const response = await fetch(`/api/cleaners/${editingCleaner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update cleaner');
        }

        toast({
          title: 'Success',
          description: 'Cleaner updated successfully',
        });
      } else {
        // Create new cleaner
        const response = await fetch('/api/cleaners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create cleaner');
        }

        toast({
          title: 'Success',
          description: 'Cleaner added successfully',
        });
      }

      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '' });
      setEditingCleaner(null);
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingCleaner ? 'Failed to update cleaner' : 'Failed to add cleaner',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (cleanerId: string) => {
    try {
      const response = await fetch(`/api/cleaners/${cleanerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete cleaner');
      }

      toast({
        title: 'Success',
        description: 'Cleaner deleted successfully',
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete cleaner',
        variant: 'destructive',
      });
    }
  };

  const getAssignedListings = (cleanerId: string) => {
    return assignments
      .filter(a => a.cleaner_id === cleanerId)
      .map(a => a.listing_name || 'Unknown')
      .join(', ');
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
        <PageHeader title="Cleaners Directory">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Cleaner
          </Button>
        </PageHeader>
        
        <div className="border rounded-xl shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Assigned Listings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleaners.map((cleaner) => (
                <TableRow key={cleaner.id}>
                  <TableCell className="font-medium">{cleaner.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {cleaner.phone && (
                        <a href={`tel:${cleaner.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                          <Phone className="h-3 w-3" />
                          {cleaner.phone}
                        </a>
                      )}
                      {cleaner.email && (
                        <a href={`mailto:${cleaner.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                          <Mail className="h-3 w-3" />
                          {cleaner.email}
                        </a>
                      )}
                      {!cleaner.phone && !cleaner.email && (
                        <span className="text-sm text-muted-foreground">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getAssignedListings(cleaner.id) || (
                      <span className="text-muted-foreground">No listings assigned</span>
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
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCleaner(cleaner);
                            setFormData({
                              name: cleaner.name,
                              email: cleaner.email || '',
                              phone: cleaner.phone || '',
                            });
                            setIsModalOpen(true);
                          }}
                        >
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(cleaner.id)}
                        >
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

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingCleaner(null);
            setFormData({ name: '', email: '', phone: '' });
          }
        }}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingCleaner ? 'Edit Cleaner' : 'Add New Cleaner'}</DialogTitle>
                <DialogDescription>
                  {editingCleaner 
                    ? 'Update the details for this cleaner.'
                    : 'Add a new cleaner to your team. You can assign them to listings later.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingCleaner ? 'Save Changes' : 'Add Cleaner'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}