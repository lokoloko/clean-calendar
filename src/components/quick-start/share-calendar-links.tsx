'use client'

import { useState, useEffect } from 'react'
import { Button } from '@gostudiom/ui'
import { Alert, AlertDescription } from '@gostudiom/ui'
import { CheckCircle2, Copy, Calendar, Share2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@gostudiom/ui'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gostudiom/ui'
import { formatPhoneForDisplay } from '@/lib/format-utils'

interface ShareCalendarLinksProps {
  onComplete: () => void
  isCompleted: boolean
}

interface CleanerWithLink {
  id: string
  name: string
  phone: string | null
  email: string | null
  shareLink?: string
  loading?: boolean
}

export function ShareCalendarLinks({ onComplete, isCompleted }: ShareCalendarLinksProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [cleaners, setCleaners] = useState<CleanerWithLink[]>([])
  const [selectedCleaner, setSelectedCleaner] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const loadCleaners = async () => {
      try {
        const response = await fetch('/api/cleaners')
        if (response.ok) {
          const data = await response.json()
          setCleaners(data)
          
          // Auto-select first cleaner
          if (data.length > 0) {
            setSelectedCleaner(data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load cleaners:', err)
      }
    }
    loadCleaners()
  }, [])

  const generateShareLink = async (cleanerId: string) => {
    try {
      setCleaners(prev => prev.map(c => 
        c.id === cleanerId ? { ...c, loading: true } : c
      ))

      const response = await fetch(`/api/cleaners/${cleanerId}/share-link`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate share link')
      }

      const data = await response.json()
      
      setCleaners(prev => prev.map(c => 
        c.id === cleanerId ? { ...c, shareLink: data.shareLink, loading: false } : c
      ))

      return data.shareLink
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate share link',
        variant: 'destructive',
      })
      setCleaners(prev => prev.map(c => 
        c.id === cleanerId ? { ...c, loading: false } : c
      ))
      return null
    }
  }

  const copyToClipboard = async (cleanerId: string) => {
    const cleaner = cleaners.find(c => c.id === cleanerId)
    
    let link = cleaner?.shareLink
    if (!link) {
      link = await generateShareLink(cleanerId)
      if (!link) return
    }

    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(cleanerId)
      setTimeout(() => setCopiedId(null), 2000)
      
      toast({
        title: 'Link Copied!',
        description: 'Calendar link copied to clipboard',
      })
      
      // Mark as complete after first copy
      if (!isCompleted) {
        setTimeout(() => {
          onComplete()
        }, 500)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  if (isCompleted) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Perfect! Your cleaners now have direct access to their schedules. They can bookmark these links for easy access.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push('/cleaners')}
        >
          Manage Cleaners
        </Button>
      </div>
    )
  }

  if (cleaners.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No cleaners found. Please add cleaners first.
        </AlertDescription>
      </Alert>
    )
  }

  const selectedCleanerData = cleaners.find(c => c.id === selectedCleaner)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Share Calendar Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleaners.length > 1 && (
            <Tabs value={selectedCleaner} onValueChange={setSelectedCleaner}>
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(cleaners.length, 3)}, 1fr)` }}>
                {cleaners.map((cleaner) => (
                  <TabsTrigger key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          
          {selectedCleanerData && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedCleanerData.name}</p>
                    {selectedCleanerData.phone && (
                      <p className="text-sm text-muted-foreground">
                        {formatPhoneForDisplay(selectedCleanerData.phone)}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(selectedCleanerData.id)}
                    disabled={selectedCleanerData.loading}
                  >
                    {selectedCleanerData.loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : copiedId === selectedCleanerData.id ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
                
                {selectedCleanerData.shareLink && (
                  <div className="text-xs text-muted-foreground break-all bg-background p-2 rounded">
                    {selectedCleanerData.shareLink}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            How to share with cleaners:
          </h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Click &quot;Copy Link&quot; for each cleaner</li>
            <li>2. Send them the link via text, WhatsApp, or email</li>
            <li>3. They can bookmark it for instant access</li>
            <li>4. No login or verification required!</li>
          </ol>
        </div>
      </div>

      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro tip:</strong> These are permanent links. Cleaners will always see their up-to-date schedule when they visit.
        </AlertDescription>
      </Alert>
    </div>
  )
}