'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

interface StepWrapperProps {
  title: string
  description: string
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  children: React.ReactNode
  className?: string
}

export function StepWrapper({
  title,
  description,
  stepNumber,
  isActive,
  isCompleted,
  children,
  className,
}: StepWrapperProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        isActive && 'ring-2 ring-primary shadow-lg',
        !isActive && !isCompleted && 'opacity-60',
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {stepNumber}
              </span>
              {isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {isCompleted && (
            <div className="text-sm text-muted-foreground">
              Completed
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          'space-y-4',
          !isActive && 'pointer-events-none'
        )}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}