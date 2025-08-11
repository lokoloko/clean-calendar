'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Plus, Trash2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { formatPhoneForDisplay } from '@/lib/format-utils'

interface Cleaner {
  id?: string
  name: string
  phone: string
  email?: string
}

interface CleanerSetupProps {
  onComplete: () => void
  isCompleted: boolean
}

export function CleanerSetup({ onComplete, isCompleted }: CleanerSetupProps) {
  const router = useRouter()
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner>({
    name: '',
    phone: '',
    email: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Load existing cleaners
  useEffect(() => {
    const loadCleaners = async () => {
      try {
        const response = await fetch('/api/cleaners')
        if (response.ok) {
          const data = await response.json()
          setCleaners(data)
          
          // If cleaners exist, mark as complete
          if (data.length > 0 && !isCompleted) {
            onComplete()
          }
        }
      } catch (err) {
        console.error('Failed to load cleaners:', err)
      }
    }
    loadCleaners()
  }, [onComplete, isCompleted])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    setCurrentCleaner({ ...currentCleaner, phone: formatted })
  }

  const handleAddCleaner = async () => {
    if (!currentCleaner.name.trim()) {
      setError('Please enter a cleaner name')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentCleaner.name.trim(),
          phone: currentCleaner.phone.replace(/\D/g, ''), // Send only digits
          email: currentCleaner.email?.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add cleaner')
      }

      const newCleaner = await response.json()
      setCleaners([...cleaners, newCleaner])
      setCurrentCleaner({ name: '', phone: '', email: '' })
      
      // Mark complete on first cleaner
      if (cleaners.length === 0) {
        setTimeout(() => {
          onComplete()
        }, 500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cleaner')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCleaner = async (id: string) => {
    try {
      const response = await fetch(`/api/cleaners/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCleaners(cleaners.filter(c => c.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete cleaner:', err)
    }
  }

  if (isCompleted && cleaners.length > 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {cleaners.length} cleaner{cleaners.length > 1 ? 's' : ''} added! You can manage them from the Cleaners page.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          {cleaners.slice(0, 3).map((cleaner) => (
            <div key={cleaner.id} className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{cleaner.name}</span>
              {cleaner.phone && (
                <span className="text-muted-foreground">• {formatPhoneForDisplay(cleaner.phone)}</span>
              )}
            </div>
          ))}
          {cleaners.length > 3 && (
            <p className="text-sm text-muted-foreground">
              And {cleaners.length - 3} more...
            </p>
          )}
        </div>

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

  return (
    <div className="space-y-4">
      {/* Add cleaner form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cleaner-name">Name</Label>
            <Input
              id="cleaner-name"
              placeholder="e.g., Maria Garcia"
              value={currentCleaner.name}
              onChange={(e) => setCurrentCleaner({ ...currentCleaner, name: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cleaner-phone">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="cleaner-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={currentCleaner.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              10-digit number (US & Canada only)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cleaner-email">
              Email <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="cleaner-email"
              type="email"
              placeholder="maria@example.com"
              value={currentCleaner.email}
              onChange={(e) => setCurrentCleaner({ ...currentCleaner, email: e.target.value })}
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleAddCleaner}
            disabled={isLoading || !currentCleaner.name.trim()}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Cleaner
          </Button>
        </CardContent>
      </Card>

      {/* Cleaners list */}
      {cleaners.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Added Cleaners ({cleaners.length})</p>
          {cleaners.map((cleaner) => (
            <div
              key={cleaner.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <p className="font-medium">{cleaner.name}</p>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  {cleaner.phone && <span>{formatPhoneForDisplay(cleaner.phone)}</span>}
                  {cleaner.email && <span>{cleaner.email}</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cleaner.id && handleDeleteCleaner(cleaner.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {cleaners.length === 0 && (
        <Alert>
          <AlertDescription>
            Add at least one cleaner to continue. You can add more later.
          </AlertDescription>
        </Alert>
      )}

      {/* SMS info */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>SMS Notifications:</strong> Once approved, you&apos;ll be able to send automated schedule reminders via SMS. 
          Cleaners will need to opt-in to receive messages.
        </AlertDescription>
      </Alert>
    </div>
  )
}