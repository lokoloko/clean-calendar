'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, X, ArrowRight } from 'lucide-react'
import { useQuickStartProgress } from '@/hooks/use-quick-start-progress'

export function QuickStartBanner() {
  const router = useRouter()
  const [isDismissed, setIsDismissed] = useState(false)
  const { progress, isLoading } = useQuickStartProgress()

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('quick_start_banner_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('quick_start_banner_dismissed', 'true')
  }

  // Don't show if loading, dismissed, or quick start is completed
  if (isLoading || isDismissed || progress.completedAt || progress.skipped) {
    return null
  }

  // Don't show if user has made significant progress
  if (progress.completedSteps.length >= 3) {
    return null
  }

  return (
    <Card className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 mb-6 overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 z-10"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
      
      <CardContent className="pt-6 pb-4 pr-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Welcome to GoStudioM! 🎉</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Set up your cleaning schedule in just 5 minutes with our quick start guide
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => router.push('/quick-start')}
            className="shrink-0"
          >
            Start Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        {progress.currentStep > 1 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((progress.currentStep - 1) / 4) * 100}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                Step {progress.currentStep} of 4
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}