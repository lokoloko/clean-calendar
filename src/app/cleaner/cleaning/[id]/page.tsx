'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Home, 
  MapPin, 
  User, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  MessageSquare,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Params {
  id: string;
}

interface Props {
  params: Promise<Params>;
}

interface CleaningItem {
  id: string;
  checkIn: string;
  checkOut: string;
  checkoutTime: string;
  guestName: string | null;
  notes: string | null;
  status: string;
  source: 'airbnb' | 'manual' | 'manual_recurring';
  listingId: string;
  listingName: string;
  listingTimezone: string;
  isCompleted: boolean;
  feedback?: {
    id: string;
    cleanlinessRating: 'clean' | 'normal' | 'dirty';
    notes: string;
    completedAt: string;
  } | null;
}

const cleanlinessOptions = [
  { value: 'clean', label: 'Clean', icon: '✨', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'normal', label: 'Normal', icon: '🏠', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'dirty', label: 'Dirty', icon: '🚮', color: 'bg-red-100 text-red-800 border-red-300' }
];

export default function CleaningDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cleaning, setCleaning] = useState<CleaningItem | null>(null);
  const [cleanlinessRating, setCleanlinessRating] = useState<'clean' | 'normal' | 'dirty' | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Temporary bypass for testing - skip authentication
    fetchCleaningDetail();
  }, [router]);

  const fetchCleaningDetail = async () => {
    // Temporary bypass for testing - use mock token
    const token = 'mock-token';

    try {
      const response = await fetch(`/api/cleaner/cleaning/${resolvedParams.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cleaning details');
      }

      const data = await response.json();
      setCleaning(data);
      
      // Pre-populate form if feedback exists
      if (data.feedback) {
        setCleanlinessRating(data.feedback.cleanlinessRating);
        setNotes(data.feedback.notes || '');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cleaning details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!cleanlinessRating) {
      toast({
        title: 'Rating required',
        description: 'Please select a cleanliness rating',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Temporary bypass for testing - use mock token
      const token = 'mock-token';
      const response = await fetch(`/api/cleaner/cleaning/${resolvedParams.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cleanlinessRating,
          notes: notes.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast({
        title: 'Success!',
        description: 'Cleaning completed and feedback submitted',
      });

      // Refresh the cleaning data
      await fetchCleaningDetail();
      
      // Navigate back to dashboard after a brief delay
      setTimeout(() => {
        router.push('/cleaner/dashboard');
      }, 1500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!cleaning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cleaning not found</h2>
          <Button onClick={() => router.push('/cleaner/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = cleaning.isCompleted || cleaning.feedback;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/cleaner/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Cleaning Details
              </h1>
              <p className="text-sm text-gray-600">{cleaning.listingName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5 text-blue-600" />
              <span>Property Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">{cleaning.listingName}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Check-out Date</Label>
                <p className="flex items-center text-sm font-medium">
                  <Calendar className="h-4 w-4 mr-1" />
                  {format(parseISO(cleaning.checkOut), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Check-out Time</Label>
                <p className="flex items-center text-sm font-medium">
                  <Clock className="h-4 w-4 mr-1" />
                  {cleaning.checkoutTime || '11:00 AM'}
                </p>
              </div>
            </div>

            {cleaning.guestName && (
              <div>
                <Label className="text-sm text-gray-600">Guest Name</Label>
                <p className="flex items-center text-sm font-medium">
                  <User className="h-4 w-4 mr-1" />
                  {cleaning.guestName}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {cleaning.source === 'airbnb' ? 'Airbnb' : 
                 cleaning.source === 'manual' ? 'Manual' : 'Recurring'}
              </Badge>
              {isCompleted && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Cleaning Feedback</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cleanliness Rating */}
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-3 block">
                How clean was the property when you arrived?
              </Label>
              <div className="grid grid-cols-1 gap-3">
                {cleanlinessOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCleanlinessRating(option.value as 'clean' | 'normal' | 'dirty')}
                    disabled={isCompleted && !submitting}
                    className={cn(
                      "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all text-left",
                      cleanlinessRating === option.value
                        ? option.color
                        : "bg-white border-gray-200 hover:border-gray-300",
                      (isCompleted && !submitting) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm opacity-75">
                        {option.value === 'clean' && 'Property was very clean'}
                        {option.value === 'normal' && 'Property was in normal condition'}
                        {option.value === 'dirty' && 'Property needed extra cleaning'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-gray-900 mb-2 block">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any issues, broken items, or special notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCompleted && !submitting}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Submit Button */}
            {!isCompleted && (
              <Button
                onClick={handleSubmitFeedback}
                disabled={submitting || !cleanlinessRating}
                className="w-full h-12 text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete Cleaning
                  </>
                )}
              </Button>
            )}

            {isCompleted && cleaning.feedback && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Completed on {format(parseISO(cleaning.feedback.completedAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  Rating: {cleanlinessOptions.find(opt => opt.value === cleaning.feedback?.cleanlinessRating)?.label}
                </p>
                {cleaning.feedback.notes && (
                  <p className="text-sm text-green-700 mt-2">
                    Notes: {cleaning.feedback.notes}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}