
'use client';

import React, { useState, useEffect } from 'react';
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
import { useParams } from 'next/navigation';
import { type Cleaner } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

// UI-only page for editing an existing cleaner.
export default function EditCleanerPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);

  // Use useEffect to find the cleaner on the client-side only
  // This prevents hydration errors by ensuring server and client render the same initial UI
  useEffect(() => {
    // TODO: Replace with real data fetch based on params.id
    const foundCleaner = mockCleaners.find(c => c.id === id);
    setCleaner(foundCleaner || null);
  }, [id]);

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
            {/* Show a loading state until the cleaner data is ready */}
            {!cleaner ? (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : (
              /* Form for editing cleaner details */
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
