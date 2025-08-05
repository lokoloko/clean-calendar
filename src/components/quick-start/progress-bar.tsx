'use client'

import { cn } from '@/lib/utils'
import { Check, Circle } from 'lucide-react'

interface Step {
  id: string
  title: string
  description: string
}

interface ProgressBarProps {
  steps: Step[]
  currentStep: number
  completedSteps: string[]
  onStepClick: (stepNumber: number) => void
  className?: string
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: ProgressBarProps) {
  const percentage = Math.round((completedSteps.length / steps.length) * 100)

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{percentage}% Complete</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Step indicators - Desktop */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-5 left-0 right-0 h-[2px] bg-muted" />
          <div
            className="absolute top-5 left-0 h-[2px] bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(completedSteps.length / (steps.length - 1)) * 100}%` }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = stepNumber === currentStep
              const canNavigate = stepNumber <= completedSteps.length + 1 || stepNumber <= currentStep

              return (
                <button
                  key={step.id}
                  onClick={() => canNavigate && onStepClick(stepNumber)}
                  disabled={!canNavigate}
                  className={cn(
                    'flex flex-col items-center gap-2 bg-background',
                    canNavigate && 'cursor-pointer',
                    !canNavigate && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      isCompleted && 'bg-primary text-primary-foreground',
                      isCurrent && !isCompleted && 'bg-primary/20 text-primary border-2 border-primary',
                      !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{stepNumber}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-primary'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[120px]">
                      {step.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step indicators - Mobile */}
      <div className="md:hidden space-y-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = stepNumber === currentStep
          const canNavigate = stepNumber <= completedSteps.length + 1 || stepNumber <= currentStep

          return (
            <button
              key={step.id}
              onClick={() => canNavigate && onStepClick(stepNumber)}
              disabled={!canNavigate}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                canNavigate && 'cursor-pointer hover:bg-muted/50',
                !canNavigate && 'cursor-not-allowed opacity-50',
                isCurrent && 'bg-primary/5 border border-primary'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && !isCompleted && 'bg-primary/20 text-primary border-2 border-primary',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">{stepNumber}</span>
                )}
              </div>
              <div className="flex-1">
                <p className={cn(
                  'font-medium',
                  isCurrent && 'text-primary'
                )}>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}