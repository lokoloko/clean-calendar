'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Home, Users, Calendar, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'

interface CompletionCelebrationProps {
  stats: {
    properties: number
    cleaners: number
    upcomingCleanings: number
  }
}

export function CompletionCelebration({ stats }: CompletionCelebrationProps) {
  const router = useRouter()
  const [hasShownConfetti, setHasShownConfetti] = useState(false)

  useEffect(() => {
    if (!hasShownConfetti) {
      // Trigger confetti animation
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)

      setHasShownConfetti(true)
    }
  }, [hasShownConfetti])

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">You&apos;re All Set! 🎉</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Congratulations! Your cleaning schedule is now automated. 
          Your cleaners will always know when and where to clean.
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Your Setup Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex justify-center mb-2">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold">{stats.properties}</div>
              <div className="text-sm text-muted-foreground">
                {stats.properties === 1 ? 'Property' : 'Properties'}
              </div>
            </div>
            <div>
              <div className="flex justify-center mb-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold">{stats.cleaners}</div>
              <div className="text-sm text-muted-foreground">
                {stats.cleaners === 1 ? 'Cleaner' : 'Cleaners'}
              </div>
            </div>
            <div>
              <div className="flex justify-center mb-2">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold">{stats.upcomingCleanings}</div>
              <div className="text-sm text-muted-foreground">
                Upcoming
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button 
          size="lg"
          className="w-full"
          onClick={() => router.push('/dashboard')}
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        
        <Button 
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() => router.push('/schedule')}
        >
          View Full Schedule
        </Button>
      </div>

      <div className="pt-6 border-t">
        <h3 className="font-semibold mb-3">What&apos;s Next?</h3>
        <div className="text-left space-y-2 max-w-md mx-auto">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Add more properties from your Airbnb account
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Set up automated SMS reminders (once approved)
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Track cleaner performance with feedback
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              View analytics and optimize your operations
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}