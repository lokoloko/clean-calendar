'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@gostudiom/ui';
import { Button } from '@gostudiom/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@gostudiom/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gostudiom/ui';
import { Label } from '@gostudiom/ui';
import { Input } from '@gostudiom/ui';
import { Textarea } from '@gostudiom/ui';
import { Badge } from '@gostudiom/ui';
import { Calendar, Construction, Home, AlertTriangle, Plus, Edit, Trash2, Clock, ChevronRight } from 'lucide-react';
import { format, parseISO, isWithinInterval, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@gostudiom/ui';

interface PropertyOverride {
  id: string;
  listing_id: string;
  listing_name?: string;
  override_type: 'unavailable' | 'maintenance' | 'construction' | 'owner_use' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  affects_cleanings: boolean;
  affected_cleanings_count?: number;
}

interface Listing {
  id: string;
  name: string;
  address?: string;
}

export default function OverridesPage() {
  const [overrides, setOverrides] = useState<PropertyOverride[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<PropertyOverride | null>(null);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    listing_id: '',
    override_type: 'unavailable' as PropertyOverride['override_type'],
    start_date: '',
    end_date: '',
    reason: '',
    affects_cleanings: true,
  });

  const [postponeData, setPostponeData] = useState({
    days_to_postpone: 1,
    affected_cleanings: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [overridesRes, listingsRes] = await Promise.all([
        fetch('/api/overrides'),
        fetch('/api/listings')
      ]);

      if (overridesRes.ok && listingsRes.ok) {
        const overridesData = await overridesRes.json();
        const listingsData = await listingsRes.json();
        
        setOverrides(overridesData);
        setListings(listingsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!formData.listing_id || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newOverride = await response.json();
        toast({
          title: 'Success',
          description: `Property marked as ${formData.override_type}`,
        });
        
        await fetchData();
        setIsModalOpen(false);
        resetForm();
        
        // Show postpone option if there are affected cleanings
        if (newOverride.affected_cleanings_count > 0) {
          setSelectedOverride(newOverride);
          setPostponeData({
            days_to_postpone: 1,
            affected_cleanings: newOverride.affected_cleanings_count,
          });
          setIsPostponeModalOpen(true);
        }
      } else {
        throw new Error('Failed to create override');
      }
    } catch (error) {
      console.error('Error creating override:', error);
      toast({
        title: 'Error',
        description: 'Failed to create override',
        variant: 'destructive',
      });
    }
  };

  const handleBulkPostpone = async () => {
    if (!selectedOverride) return;

    try {
      const response = await fetch(`/api/overrides/${selectedOverride.id}/postpone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days_to_postpone: postponeData.days_to_postpone,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: `Postponed ${result.count} cleaning(s) by ${postponeData.days_to_postpone} day(s)`,
        });
        setIsPostponeModalOpen(false);
        await fetchData();
      } else {
        throw new Error('Failed to postpone cleanings');
      }
    } catch (error) {
      console.error('Error postponing cleanings:', error);
      toast({
        title: 'Error',
        description: 'Failed to postpone cleanings',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return;

    try {
      const response = await fetch(`/api/overrides/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Override deleted',
        });
        await fetchData();
      } else {
        throw new Error('Failed to delete override');
      }
    } catch (error) {
      console.error('Error deleting override:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete override',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      listing_id: '',
      override_type: 'unavailable',
      start_date: '',
      end_date: '',
      reason: '',
      affects_cleanings: true,
    });
  };

  const getOverrideIcon = (type: PropertyOverride['override_type']) => {
    switch (type) {
      case 'construction':
        return <Construction className="h-4 w-4" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4" />;
      case 'owner_use':
        return <Home className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getOverrideColor = (type: PropertyOverride['override_type']) => {
    switch (type) {
      case 'construction':
        return 'destructive';
      case 'maintenance':
        return 'secondary';
      case 'owner_use':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeOverrides = overrides.filter(o => 
    isWithinInterval(new Date(), {
      start: parseISO(o.start_date),
      end: parseISO(o.end_date),
    })
  );

  const upcomingOverrides = overrides.filter(o => 
    parseISO(o.start_date) > new Date()
  );

  const pastOverrides = overrides.filter(o => 
    parseISO(o.end_date) < new Date()
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Property Overrides</h1>
          <p className="text-muted-foreground mt-1">
            Manage property unavailability and postpone cleanings
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Override
        </Button>
      </div>

      {/* Active Overrides */}
      {activeOverrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Overrides</CardTitle>
            <CardDescription>Properties currently unavailable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeOverrides.map(override => (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-destructive/10">
                      {getOverrideIcon(override.override_type)}
                    </div>
                    <div>
                      <div className="font-semibold">{override.listing_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(override.start_date), 'MMM d')} - {format(parseISO(override.end_date), 'MMM d, yyyy')}
                      </div>
                      {override.reason && (
                        <div className="text-sm mt-1">{override.reason}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getOverrideColor(override.override_type)}>
                          {override.override_type.replace('_', ' ')}
                        </Badge>
                        {override.affected_cleanings_count && override.affected_cleanings_count > 0 && (
                          <Badge variant="outline">
                            {override.affected_cleanings_count} cleaning(s) affected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteOverride(override.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Overrides */}
      {upcomingOverrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Overrides</CardTitle>
            <CardDescription>Scheduled property unavailability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingOverrides.map(override => (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getOverrideIcon(override.override_type)}
                    </div>
                    <div>
                      <div className="font-semibold">{override.listing_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Starts {format(parseISO(override.start_date), 'MMM d, yyyy')}
                      </div>
                      {override.reason && (
                        <div className="text-sm mt-1">{override.reason}</div>
                      )}
                      <Badge variant={getOverrideColor(override.override_type)} className="mt-2">
                        {override.override_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteOverride(override.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Overrides Message */}
      {overrides.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Property Overrides</h3>
            <p className="text-muted-foreground mb-4">
              All properties are available for cleaning
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Override
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Override Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Property Unavailable</DialogTitle>
            <DialogDescription>
              Set a period when the property cannot be cleaned
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Property *</Label>
              <Select
                value={formData.listing_id}
                onValueChange={(value) => setFormData({ ...formData, listing_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {listings.map(listing => (
                    <SelectItem key={listing.id} value={listing.id}>
                      {listing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason *</Label>
              <Select
                value={formData.override_type}
                onValueChange={(value) => setFormData({ ...formData, override_type: value as PropertyOverride['override_type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="owner_use">Owner Use</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Enter any additional details..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Any cleanings scheduled during this period will need to be postponed
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOverride}>
              Create Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Postpone Cleanings Modal */}
      <Dialog open={isPostponeModalOpen} onOpenChange={setIsPostponeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postpone Affected Cleanings</DialogTitle>
            <DialogDescription>
              {postponeData.affected_cleanings} cleaning(s) need to be rescheduled
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                The property override affects {postponeData.affected_cleanings} scheduled cleaning(s). 
                How many days would you like to postpone them?
              </AlertDescription>
            </Alert>

            <div>
              <Label>Days to Postpone</Label>
              <Select
                value={postponeData.days_to_postpone.toString()}
                onValueChange={(value) => setPostponeData({ ...postponeData, days_to_postpone: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPostponeModalOpen(false)}>
              Skip
            </Button>
            <Button onClick={handleBulkPostpone}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Postpone Cleanings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}