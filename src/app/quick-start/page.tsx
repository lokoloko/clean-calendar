'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useQuickStartProgress } from '@/hooks/use-quick-start-progress'
import { ProgressBar } from '@/components/quick-start/progress-bar'
import { StepWrapper } from '@/components/quick-start/step-wrapper'
import { CalendarConnect } from '@/components/quick-start/calendar-connect'
import { CleanerSetup } from '@/components/quick-start/cleaner-setup'
import { PropertyAssignment } from '@/components/quick-start/property-assignment'
import { ScheduleExport } from '@/components/quick-start/schedule-export'
import { CompletionCelebration } from '@/components/quick-start/completion-celebration'
import { ChevronLeft, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const steps = [
  {
    id: 'step-1',
    title: 'Connect Calendar',
    description: '2 minutes',
  },
  {
    id: 'step-2',
    title: 'Add Cleaners',
    description: '2 minutes',
  },
  {
    id: 'step-3',
    title: 'Assign Properties',
    description: '1 minute',
  },
  {
    id: 'step-4',
    title: 'Share Schedule',
    description: '1 minute',
  },
]

export default function QuickStartPage() {
  const router = useRouter()
  const [showSkipDialog, setShowSkipDialog] = useState(false)
  const [stats, setStats] = useState({
    properties: 0,
    cleaners: 0,
    upcomingCleanings: 0,
  })
  
  const {
    progress,
    isLoading,
    completeStep,
    goToStep,
    skipQuickStart,
    isStepCompleted,
    calculatePercentage,
  } = useQuickStartProgress()

  // Load stats for completion screen
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [listingsRes, cleanersRes, scheduleRes] = await Promise.all([
          fetch('/api/listings'),
          fetch('/api/cleaners'),
          fetch('/api/schedule')
        ])

        if (listingsRes.ok && cleanersRes.ok && scheduleRes.ok) {
          const listings = await listingsRes.json()
          const cleaners = await cleanersRes.json()
          const schedule = await scheduleRes.json()
          
          setStats({
            properties: listings.length,
            cleaners: cleaners.length,
            upcomingCleanings: schedule.filter((item: any) => 
              new Date(item.check_out) > new Date() && item.status !== 'cancelled'
            ).length,
          })
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
      }
    }
    loadStats()
  }, [progress.currentStep])

  const handleSkip = () => {
    skipQuickStart()
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const isCompleted = progress.currentStep === 5 || !!progress.completedAt

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {progress.currentStep > 1 && !isCompleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToStep(progress.currentStep - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <h1 className="text-xl font-semibold">
                {isCompleted ? 'Setup Complete!' : 'Quick Start Guide'}
              </h1>
            </div>
            {!isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSkipDialog(true)}
              >
                <X className="h-4 w-4 mr-1" />
                Skip
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Bar - Hide on completion */}
      {!isCompleted && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ProgressBar
            steps={steps}
            currentStep={progress.currentStep}
            completedSteps={progress.completedSteps}
            onStepClick={goToStep}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
        {/* Step 1: Connect Calendar */}
        {progress.currentStep === 1 && (
          <StepWrapper
            title="Connect Your Airbnb Calendar"
            description="Import your bookings by connecting your Airbnb calendar"
            stepNumber={1}
            isActive={true}
            isCompleted={isStepCompleted('step-1')}
          >
            <CalendarConnect
              onComplete={() => completeStep('step-1')}
              isCompleted={isStepCompleted('step-1')}
            />
          </StepWrapper>
        )}

        {/* Step 2: Add Cleaners */}
        {progress.currentStep === 2 && (
          <StepWrapper
            title="Add Your Cleaners"
            description="Add the people who clean your properties"
            stepNumber={2}
            isActive={true}
            isCompleted={isStepCompleted('step-2')}
          >
            <CleanerSetup
              onComplete={() => completeStep('step-2')}
              isCompleted={isStepCompleted('step-2')}
            />
          </StepWrapper>
        )}

        {/* Step 3: Assign Properties */}
        {progress.currentStep === 3 && (
          <StepWrapper
            title="Assign Cleaners to Properties"
            description="Choose who cleans each property"
            stepNumber={3}
            isActive={true}
            isCompleted={isStepCompleted('step-3')}
          >
            <PropertyAssignment
              onComplete={() => completeStep('step-3')}
              isCompleted={isStepCompleted('step-3')}
            />
          </StepWrapper>
        )}

        {/* Step 4: Share Schedule */}
        {progress.currentStep === 4 && (
          <StepWrapper
            title="Share Your First Schedule"
            description="Export and share this week's cleaning schedule"
            stepNumber={4}
            isActive={true}
            isCompleted={isStepCompleted('step-4')}
          >
            <ScheduleExport
              onComplete={() => completeStep('step-4')}
              isCompleted={isStepCompleted('step-4')}
            />
          </StepWrapper>
        )}

        {/* Step 5: Completion */}
        {isCompleted && (
          <CompletionCelebration stats={stats} />
        )}
      </main>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Quick Start?</AlertDialogTitle>
            <AlertDialogDescription>
              You can always come back to this guide later from the dashboard. 
              Are you sure you want to skip the setup?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Setup</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkip}>
              Skip to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}