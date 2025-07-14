
'use client';

import React from 'react';
import { AppLayout } from '@/components/layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockCleaners, mockListings } from '@/data/mock-data';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// UI-only page for editing an existing listing.
export default function EditListingPage({ params }: { params: { id: string } }) {
  // TODO: Replace with real data fetch based on params.id
  const listing = mockListings.find(l => l.id === params.id) || mockListings[0];
  const { toast } = useToast();

  // Handler for form submission.
  const handleSaveChanges = () => {
    // TODO: Implement actual save logic.
    toast({
      title: 'Success!',
      description: 'Listing details have been saved.',
    });
  };

  return (
    <AppLayout>
      {/* Main layout for the edit listing page */}
      <div className="flex flex-col gap-8">
        {/* Page Header Component */}
        <PageHeader title="Edit Listing" />

        {/* Card containing the edit form */}
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
            <CardDescription>
              Update the details for this listing. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Form for editing listing details */}
            <form className="grid gap-6">
              {/* Field for Listing Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Listing Name</Label>
                <Input id="name" defaultValue={listing.name} />
              </div>
              
              {/* Field for Airbnb Calendar Link (.ics) */}
              <div className="grid gap-2">
                <Label htmlFor="icsUrl">Airbnb Calendar Link (.ics)</Label>
                <Input id="icsUrl" defaultValue={listing.icsUrl} />
              </div>

              {/* Field for Cleaning Fee */}
              <div className="grid gap-2">
                <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
                <Input id="cleaningFee" type="number" defaultValue={listing.cleaningFee} placeholder="e.g. 50" />
              </div>

              {/* Field for Assigned Cleaner */}
              <div className="grid gap-2">
                <Label htmlFor="cleaner">Assigned Cleaner</Label>
                <Select defaultValue={mockCleaners.find(c => listing.assignedCleaners.includes(c.name))?.id}>
                  <SelectTrigger id="cleaner">
                    <SelectValue placeholder="Select a cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Render all cleaners as dropdown options */}
                    {mockCleaners.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Action buttons for saving or canceling */}
              <div className="flex items-center gap-2 pt-4">
                <Button type="button" onClick={handleSaveChanges}>Save Changes</Button>
                <Button variant="outline" asChild>
                  <Link href="/listings">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
