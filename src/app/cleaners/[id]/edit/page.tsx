
'use client';

import React from 'react';
import { AppLayout } from '@/components/layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockCleaners, mockListings } from '@/data/mock-data';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// UI-only page for editing an existing cleaner.
export default function EditCleanerPage({ params }: { params: { id: string } }) {
  // TODO: Replace with real data fetch based on params.id
  const cleaner = mockCleaners.find(c => c.id === params.id) || mockCleaners[0];
  const { toast } = useToast();

  // Handler for form submission.
  const handleSaveChanges = () => {
    // TODO: Implement actual save logic.
    toast({
      title: 'Success!',
      description: 'Cleaner details have been saved.',
    });
  };
  
  return (
    <AppLayout>
      {/* Main layout for the edit cleaner page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Edit Cleaner" />

        {/* Card containing the edit form */}
        <Card>
          <CardHeader>
            <CardTitle>Cleaner Details</CardTitle>
            <CardDescription>
              Update the details for this cleaner. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Form for editing cleaner details */}
            <form className="grid gap-6">
              {/* Field for Cleaner Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Cleaner Name</Label>
                <Input id="name" defaultValue={cleaner.name} />
              </div>
              
              {/* Field for Phone Number */}
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" defaultValue={cleaner.phone} />
              </div>

              {/* Field for Email Address */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={cleaner.email} />
              </div>

              {/* Field for Assigned Listings (multi-select) */}
              <div className="grid gap-2">
                <Label htmlFor="assigned-listings">Assigned Listings</Label>
                 {/* TODO: Implement a proper multi-select component. Using a simple select for now. */}
                <Select>
                    <SelectTrigger id="assigned-listings">
                        <SelectValue placeholder="Select listings to assign" />
                    </SelectTrigger>
                    <SelectContent>
                        {mockListings.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Display currently assigned listings as badges */}
                  {mockListings
                    .filter(l => l.assignedCleaners.includes(cleaner.name))
                    .map(l => <Badge key={l.id} variant="secondary">{l.name}</Badge>)
                  }
                </div>
              </div>

              {/* Action buttons for saving or canceling */}
              <div className="flex items-center gap-2 pt-4">
                <Button type="button" onClick={handleSaveChanges}>Save Changes</Button>
                <Button variant="outline" asChild>
                  <Link href="/cleaners">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
