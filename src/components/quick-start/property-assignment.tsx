'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Home, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Property {
  id: string
  name: string
}

interface Cleaner {
  id: string
  name: string
}

interface Assignment {
  id?: string
  listing_id: string
  cleaner_id: string
}

interface PropertyAssignmentProps {
  onComplete: () => void
  isCompleted: boolean
}

export function PropertyAssignment({ onComplete, isCompleted }: PropertyAssignmentProps) {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load properties and cleaners
        const [propsRes, cleanersRes, assignRes] = await Promise.all([
          fetch('/api/listings'),
          fetch('/api/cleaners'),
          fetch('/api/assignments')
        ])

        if (propsRes.ok && cleanersRes.ok && assignRes.ok) {
          const propsData = await propsRes.json()
          const cleanersData = await cleanersRes.json()
          const assignData = await assignRes.json()

          setProperties(propsData)
          setCleaners(cleanersData)

          // Build assignment map
          const assignMap: Record<string, string> = {}
          assignData.forEach((assign: Assignment) => {
            assignMap[assign.listing_id] = assign.cleaner_id
          })
          setAssignments(assignMap)

          // Check if all properties have cleaners assigned
          if (propsData.length > 0 && propsData.every((p: Property) => assignMap[p.id])) {
            onComplete()
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load properties and cleaners')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [onComplete])

  const handleAssignment = (propertyId: string, cleanerId: string) => {
    setAssignments({ ...assignments, [propertyId]: cleanerId })
    setError('')
  }

  const handleAssignAll = (cleanerId: string) => {
    const newAssignments: Record<string, string> = {}
    properties.forEach(property => {
      newAssignments[property.id] = cleanerId
    })
    setAssignments(newAssignments)
  }

  const handleSaveAssignments = async () => {
    // Check if all properties have assignments
    const unassigned = properties.filter(p => !assignments[p.id])
    if (unassigned.length > 0) {
      setError(`Please assign cleaners to all properties (${unassigned.length} remaining)`)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      // Save all assignments
      const promises = Object.entries(assignments).map(([listingId, cleanerId]) =>
        fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id: listingId, cleaner_id: cleanerId }),
        })
      )

      await Promise.all(promises)
      
      setTimeout(() => {
        onComplete()
      }, 500)
    } catch (err) {
      setError('Failed to save assignments')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All properties have cleaners assigned! You can manage assignments anytime.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push('/assignments')}
        >
          Manage Assignments
        </Button>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No properties found. Please connect your calendar first.
        </AlertDescription>
      </Alert>
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

  return (
    <div className="space-y-4">
      {/* Quick assign all */}
      {cleaners.length === 1 && (
        <Alert>
          <AlertDescription>
            You have one cleaner. Click below to assign them to all properties.
          </AlertDescription>
        </Alert>
      )}

      {cleaners.length > 1 && (
        <div className="space-y-2">
          <Label>Quick Assign All Properties</Label>
          <div className="flex gap-2">
            <Select onValueChange={handleAssignAll}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a cleaner for all" />
              </SelectTrigger>
              <SelectContent>
                {cleaners.map((cleaner) => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Or assign individually below
          </p>
        </div>
      )}

      {/* Individual assignments */}
      <div className="space-y-3">
        {properties.map((property) => (
          <div key={property.id} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{property.name}</span>
              </div>
            </div>
            <Select
              value={assignments[property.id] || ''}
              onValueChange={(value) => handleAssignment(property.id, value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select cleaner" />
              </SelectTrigger>
              <SelectContent>
                {cleaners.map((cleaner) => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSaveAssignments}
        disabled={isSaving || Object.keys(assignments).length === 0}
        className="w-full"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Assignments'
        )}
      </Button>

      {cleaners.length === 1 && properties.length === 1 && !assignments[properties[0].id] && (
        <Button
          variant="secondary"
          onClick={() => {
            handleAssignment(properties[0].id, cleaners[0].id)
            handleSaveAssignments()
          }}
          className="w-full"
        >
          Assign {cleaners[0].name} to {properties[0].name}
        </Button>
      )}
    </div>
  )
}