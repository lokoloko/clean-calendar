'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Loader2, Zap, Search, Brain, FileText } from 'lucide-react'

interface Stage {
  id: string
  name: string
  description: string
  icon: any
  duration: string
}

const stages: Stage[] = [
  {
    id: 'fetch',
    name: 'Fetching Listing',
    description: 'Connecting to Airbnb and loading your listing data',
    icon: Search,
    duration: '5-10s'
  },
  {
    id: 'extract',
    name: 'Extracting Details',
    description: 'Gathering photos, amenities, reviews, and pricing',
    icon: FileText,
    duration: '10-20s'
  },
  {
    id: 'analyze',
    name: 'AI Analysis',
    description: 'Comparing with top performers and generating insights',
    icon: Brain,
    duration: '5-10s'
  },
  {
    id: 'optimize',
    name: 'Creating Recommendations',
    description: 'Building your personalized optimization plan',
    icon: Zap,
    duration: '2-5s'
  }
]

interface AnalysisProgressProps {
  currentStage?: string
  progress?: number
  message?: string
}

export default function AnalysisProgress({ 
  currentStage = 'fetch',
  progress = 0,
  message
}: AnalysisProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(dotsTimer)
  }, [])

  const currentStageIndex = stages.findIndex(s => s.id === currentStage)
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Estimate total time based on stage
  const estimatedTotal = 45 // seconds
  const progressPercentage = Math.min((elapsedTime / estimatedTotal) * 100, 95)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analyzing Your Listing{dots}
            </h2>
            <p className="text-gray-600">
              {message || "This usually takes 30-45 seconds. We're being thorough!"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Elapsed: {formatTime(elapsedTime)}</span>
              <span>Est. remaining: {formatTime(Math.max(0, estimatedTotal - elapsedTime))}</span>
            </div>
          </div>

          {/* Stages */}
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const isCompleted = index < currentStageIndex
              const isCurrent = index === currentStageIndex
              const isPending = index > currentStageIndex

              return (
                <div 
                  key={stage.id}
                  className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                    isCurrent ? 'bg-blue-50 border-2 border-blue-200' : 
                    isCompleted ? 'bg-green-50' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : isCurrent ? (
                      <stage.icon className="w-6 h-6 text-blue-600 animate-pulse" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold ${
                        isCurrent ? 'text-blue-900' : 
                        isCompleted ? 'text-green-900' : 'text-gray-600'
                      }`}>
                        {stage.name}
                      </h3>
                      <span className="text-xs text-gray-500">{stage.duration}</span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      isCurrent ? 'text-blue-700' : 
                      isCompleted ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {stage.description}
                    </p>
                    {isCurrent && (
                      <div className="mt-2">
                        <div className="h-1 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full animate-progress" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Fun Facts / Tips */}
          <div className="mt-8 p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>💡 Did you know?</strong> Listings with professional photos get 40% more bookings on average.
            </p>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="text-center mt-6">
          <button className="text-gray-600 hover:text-gray-900 text-sm">
            Cancel Analysis
          </button>
        </div>
      </div>
    </div>
  )
}