'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Copy, Calendar, MessageSquare, Mail, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { generateExportForCleaner } from '@/lib/schedule-export'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ScheduleExportProps {
  onComplete: () => void
  isCompleted: boolean
}

export function ScheduleExport({ onComplete, isCompleted }: ScheduleExportProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [schedule, setSchedule] = useState<any[]>([])
  const [cleaners, setCleaners] = useState<any[]>([])
  const [exportText, setExportText] = useState('')
  const [selectedCleaner, setSelectedCleaner] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scheduleRes, cleanersRes] = await Promise.all([
          fetch('/api/schedule?start=' + new Date().toISOString()),
          fetch('/api/cleaners')
        ])

        if (scheduleRes.ok && cleanersRes.ok) {
          const scheduleData = await scheduleRes.json()
          const cleanersData = await cleanersRes.json()
          
          setSchedule(scheduleData)
          setCleaners(cleanersData)
          
          // Auto-select first cleaner
          if (cleanersData.length > 0) {
            setSelectedCleaner(cleanersData[0].id)
            generateScheduleFor(cleanersData[0].id, scheduleData)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      }
    }
    loadData()
  }, [])

  const generateScheduleFor = (cleanerId: string, scheduleData?: any[]) => {
    const data = scheduleData || schedule
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    
    const text = generateExportForCleaner({
      cleanerId,
      startDate: today,
      endDate: nextWeek,
      exportType: 'range',
      scheduleItems: data
    })
    
    setExportText(text)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      toast({
        title: 'Copied!',
        description: 'Schedule copied to clipboard',
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
            Great job! You&apos;ve exported your first schedule. Your cleaners can now see their upcoming work.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push('/schedule')}
        >
          View Full Schedule
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>This Week&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleaners.length > 1 && (
            <Tabs value={selectedCleaner} onValueChange={(value) => {
              setSelectedCleaner(value)
              generateScheduleFor(value)
            }}>
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(cleaners.length, 3)}, 1fr)` }}>
                {cleaners.map((cleaner) => (
                  <TabsTrigger key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          
          <div className="relative">
            <Textarea
              value={exportText}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-medium">Share via:</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button variant="outline" size="sm" disabled>
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS (Coming Soon)
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Mail className="h-4 w-4 mr-2" />
            Email (Coming Soon)
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Tip:</strong> Once SMS is approved, cleaners can receive their schedules automatically every morning!
        </AlertDescription>
      </Alert>
    </div>
  )
}