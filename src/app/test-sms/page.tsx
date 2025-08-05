'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestSMSPage() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Test message from GoStudioM')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestSMS = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test/send-test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to send SMS')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Test SMS Sending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="6265551234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter 10-digit phone number without country code
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button 
            onClick={sendTestSMS} 
            disabled={loading || !phone || !message}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Test SMS'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">SMS Sent Successfully!</p>
                  {result.twilioResponse && (
                    <>
                      <p className="text-sm">SID: {result.twilioResponse.sid}</p>
                      <p className="text-sm">Status: {result.twilioResponse.status}</p>
                      <p className="text-sm">To: {result.twilioResponse.to}</p>
                      <p className="text-sm">From: {result.twilioResponse.from}</p>
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}