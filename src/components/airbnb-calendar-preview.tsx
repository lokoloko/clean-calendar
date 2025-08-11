'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface PreviewBooking {
  checkOut: string;
  checkOutDay: string;
  guestName: string;
  nights: number;
  sameDayTurnover: boolean;
}

interface PreviewStats {
  totalBookings: number;
  sameDayTurnovers: number;
  avgTurnoverDays: string;
  nextCheckout: {
    date: string;
    guestName: string;
    daysFromNow: number;
  } | null;
}

interface AirbnbCalendarPreviewProps {
  stats: PreviewStats;
  preview: PreviewBooking[];
  onSignIn: () => void;
}

export function AirbnbCalendarPreview({ stats, preview, onSignIn }: AirbnbCalendarPreviewProps) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Success Alert */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Valid Airbnb calendar found! Here&apos;s your cleaning schedule preview.
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Cleanings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card className={stats.sameDayTurnovers > 0 ? 'border-orange-200' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${stats.sameDayTurnovers > 0 ? 'text-orange-600' : 'text-primary'}`} />
              Same-Day Turnovers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sameDayTurnovers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sameDayTurnovers > 0 ? 'Need coordination!' : 'None detected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Avg Turnover Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgTurnoverDays} {stats.avgTurnoverDays !== 'N/A' ? 'days' : ''}
            </div>
            <p className="text-xs text-muted-foreground">Between guests</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Checkout Alert */}
      {stats.nextCheckout && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Next cleaning:</strong> {stats.nextCheckout.guestName} checks out {stats.nextCheckout.date}
            {stats.nextCheckout.daysFromNow === 0 && ' (Today!)'}
            {stats.nextCheckout.daysFromNow === 1 && ' (Tomorrow!)'}
            {stats.nextCheckout.daysFromNow > 1 && ` (in ${stats.nextCheckout.daysFromNow} days)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Schedule */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Next Cleanings</CardTitle>
            <CardDescription>
              Preview of upcoming checkouts that need cleaning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preview.map((booking, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{booking.guestName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                      </Badge>
                      {booking.sameDayTurnover && (
                        <Badge variant="destructive" className="text-xs">
                          Same-day turnover
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {booking.checkOutDay}, {booking.checkOut}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            
            {stats.totalBookings > preview.length && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                And {stats.totalBookings - preview.length} more bookings...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Ready to automate your cleaning schedule?</h3>
              <p className="text-sm text-muted-foreground">
                Sign in to save this schedule, assign cleaners, and get automatic notifications.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button size="lg" onClick={onSignIn}>
                Sign in with Google
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Free for 1 property</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}