'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Cleaner {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Assignment {
  id: string;
  listing_id: string;
  cleaner_id: string;
}

interface AssignCleanersContentProps {
  listingId: string;
  listingName: string;
}

export function AssignCleanersContent({ listingId, listingName }: AssignCleanersContentProps) {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCleaners, setSelectedCleaners] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [listingId]);

  const fetchData = async () => {
    try {
      const [cleanersRes, assignmentsRes] = await Promise.all([
        fetch('/api/cleaners'),
        fetch('/api/assignments')
      ]);

      if (cleanersRes.ok) {
        const cleanersData = await cleanersRes.json();
        setCleaners(Array.isArray(cleanersData) ? cleanersData : []);
      }

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const listingAssignments = assignmentsData.filter(
          (a: Assignment) => a.listing_id === listingId
        );
        setAssignments(listingAssignments);
        
        // Set initial selected cleaners
        const assigned = new Set<string>(listingAssignments.map((a: Assignment) => a.cleaner_id));
        setSelectedCleaners(assigned);
      }
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

  const handleToggleCleaner = (cleanerId: string) => {
    const newSelected = new Set(selectedCleaners);
    if (newSelected.has(cleanerId)) {
      newSelected.delete(cleanerId);
    } else {
      newSelected.add(cleanerId);
    }
    setSelectedCleaners(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Get current assignments for this listing
      const currentAssigned = new Set(
        assignments.map(a => a.cleaner_id)
      );
      
      // Determine what to add and remove
      const toAdd = Array.from(selectedCleaners).filter(id => !currentAssigned.has(id));
      const toRemove = Array.from(currentAssigned).filter(id => !selectedCleaners.has(id));
      
      // Remove assignments
      for (const cleanerId of toRemove) {
        const assignment = assignments.find(
          a => a.cleaner_id === cleanerId && a.listing_id === listingId
        );
        if (assignment) {
          await fetch(`/api/assignments/${assignment.id}`, {
            method: 'DELETE'
          });
        }
      }
      
      // Add new assignments
      for (const cleanerId of toAdd) {
        await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: listingId,
            cleaner_id: cleanerId
          })
        });
      }
      
      toast({
        title: 'Success',
        description: 'Cleaner assignments updated',
      });
      
      // Refresh data
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update assignments',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/listings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Cleaners to {listingName}</CardTitle>
          <CardDescription>
            Select which cleaners are responsible for this property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cleaners.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No cleaners available</p>
                <Link href="/cleaners">
                  <Button>Add Cleaners</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cleaners.map((cleaner) => (
                    <div
                      key={cleaner.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={cleaner.id}
                        checked={selectedCleaners.has(cleaner.id)}
                        onCheckedChange={() => handleToggleCleaner(cleaner.id)}
                      />
                      <label
                        htmlFor={cleaner.id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{cleaner.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {cleaner.phone}
                          {cleaner.email && ` • ${cleaner.email}`}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Link href="/listings">
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Assignments'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}