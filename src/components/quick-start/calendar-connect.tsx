'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CheckCircle2, ExternalLink, HelpCircle, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

interface CalendarConnectProps {
  onComplete: () => void
  isCompleted: boolean
}

export function CalendarConnect({ onComplete, isCompleted }: CalendarConnectProps) {
  const router = useRouter()
  const [calendarUrl, setCalendarUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const validateAirbnbUrl = (url: string): boolean => {
    const airbnbRegex = /^https:\/\/(www\.)?airbnb\.(com|[a-z]{2})\/calendar\/ical\/.+\.ics(\?.*)?$/i
    return airbnbRegex.test(url)
  }

  const handleConnect = async () => {
    if (!calendarUrl) {
      setError('Please enter your Airbnb calendar URL')
      return
    }

    if (!validateAirbnbUrl(calendarUrl)) {
      setError('Please enter a valid Airbnb calendar URL (it should end with .ics)')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      // Create a new listing with the calendar URL
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Airbnb Property',
          ics_url: calendarUrl,
          cleaning_fee: 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect calendar')
      }

      setSuccess(true)
      
      // Mark step as complete after a short delay
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCompleted && !success) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Calendar already connected! You can add more calendars from the Listings page.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push('/listings')}
        >
          Manage Listings
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!success ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="calendar-url">Airbnb Calendar URL</Label>
            <Input
              id="calendar-url"
              type="url"
              placeholder="https://www.airbnb.com/calendar/ical/..."
              value={calendarUrl}
              onChange={(e) => {
                setCalendarUrl(e.target.value)
                setError('')
              }}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Paste your .ics calendar link from Airbnb
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleConnect}
            disabled={isLoading || !calendarUrl}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Calendar'
            )}
          </Button>

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-full justify-center"
          >
            <HelpCircle className="h-4 w-4" />
            How do I find my Airbnb calendar URL?
          </button>

          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleContent className="space-y-2">
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>Log in to your Airbnb account and go to <strong>Calendar</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>Click on <strong>Availability settings</strong> in the right panel</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Scroll to the bottom, click <strong>Connect another calendar</strong> → <strong>Connect another website</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>Copy the link that ends with <code className="px-1 py-0.5 bg-background rounded">.ics</code></span>
                    </li>
                  </ol>
                  <div className="mt-4 pt-4 border-t">
                    <a
                      href="https://www.airbnb.com/hosting/calendar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Go to Airbnb Calendar
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Calendar connected successfully! Your bookings are being synced.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}