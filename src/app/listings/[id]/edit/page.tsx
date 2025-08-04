
'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Listing {
  id: string;
  name: string;
  ics_url: string | null;
  cleaning_fee: number;
  timezone: string;
  is_active_on_airbnb: boolean;
}

interface Cleaner {
  id: string;
  name: string;
}

// Page for editing an existing listing.
export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    ics_url: '',
    cleaning_fee: '',
    timezone: 'America/New_York',
    is_active_on_airbnb: true,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch listing details
      const listingRes = await fetch(`/api/listings/${id}`);
      if (!listingRes.ok) {
        throw new Error('Failed to fetch listing');
      }
      const listingData = await listingRes.json();
      setListing(listingData);
      setFormData({
        name: listingData.name,
        ics_url: listingData.ics_url || '',
        cleaning_fee: listingData.cleaning_fee.toString(),
        timezone: listingData.timezone || 'America/New_York',
        is_active_on_airbnb: listingData.is_active_on_airbnb !== false,
      });

      // Fetch cleaners
      const cleanersRes = await fetch('/api/cleaners');
      if (!cleanersRes.ok) {
        throw new Error('Failed to fetch cleaners');
      }
      const cleanersData = await cleanersRes.json();
      setCleaners(cleanersData);

      // Fetch assignments to find assigned cleaner
      const assignmentsRes = await fetch('/api/assignments');
      if (!assignmentsRes.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const assignmentsData = await assignmentsRes.json();
      const assignment = assignmentsData.find((a: any) => a.listing_id === id);
      if (assignment) {
        setSelectedCleanerId(assignment.cleaner_id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load listing details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for form submission.
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Update listing
      const response = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          ics_url: formData.is_active_on_airbnb ? formData.ics_url : null,
          cleaning_fee: parseFloat(formData.cleaning_fee) || 0,
          timezone: formData.timezone,
          is_active_on_airbnb: formData.is_active_on_airbnb,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update listing');
      }

      // Handle cleaner assignment
      if (selectedCleanerId) {
        // First, check if there's an existing assignment
        const assignmentsRes = await fetch('/api/assignments');
        const assignments = await assignmentsRes.json();
        const existingAssignment = assignments.find((a: any) => a.listing_id === id);

        if (existingAssignment) {
          // Update existing assignment if cleaner changed
          if (existingAssignment.cleaner_id !== selectedCleanerId) {
            // Delete old assignment
            await fetch(`/api/assignments/${existingAssignment.id}`, {
              method: 'DELETE',
            });
            
            // Create new assignment
            await fetch('/api/assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                listing_id: id,
                cleaner_id: selectedCleanerId,
              }),
            });
          }
        } else {
          // Create new assignment
          await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listing_id: id,
              cleaner_id: selectedCleanerId,
            }),
          });
        }
      }

      toast({
        title: 'Success!',
        description: 'Listing details have been saved.',
      });
      
      router.push('/listings');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    }
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
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
            <form onSubmit={handleSaveChanges} className="grid gap-6">
              {/* Field for Listing Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Listing Name</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              {/* Checkbox for Airbnb status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_airbnb"
                  checked={formData.is_active_on_airbnb}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_active_on_airbnb: checked as boolean })
                  }
                />
                <Label
                  htmlFor="is_airbnb"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  This property is listed on Airbnb
                </Label>
              </div>
              
              {/* Field for Airbnb Calendar Link (.ics) */}
              {formData.is_active_on_airbnb && (
              <div className="grid gap-2">
                <Label htmlFor="icsUrl">Airbnb Calendar Link (.ics)</Label>
                <Input 
                  id="icsUrl" 
                  value={formData.ics_url}
                  onChange={(e) => setFormData({ ...formData, ics_url: e.target.value })}
                  required
                />
              </div>
              )}

              {/* Field for Cleaning Fee */}
              <div className="grid gap-2">
                <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
                <Input 
                  id="cleaningFee" 
                  type="number" 
                  value={formData.cleaning_fee}
                  onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                  placeholder="e.g. 50" 
                />
              </div>

              {/* Field for Timezone */}
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
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

              {/* Field for Assigned Cleaner */}
              <div className="grid gap-2">
                <Label htmlFor="cleaner">Assigned Cleaner</Label>
                <Select value={selectedCleanerId} onValueChange={setSelectedCleanerId}>
                  <SelectTrigger id="cleaner">
                    <SelectValue placeholder="Select a cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Render all cleaners as dropdown options */}
                    {cleaners.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Action buttons for saving or canceling */}
              <div className="flex items-center gap-2 pt-4">
                <Button type="submit">Save Changes</Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/listings">Cancel</Link>
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
