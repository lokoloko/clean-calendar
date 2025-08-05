'use client'

import { useState, useEffect, useCallback } from 'react'

export interface QuickStartProgress {
  currentStep: number
  completedSteps: string[]
  startedAt: string
  completedAt?: string
  skipped?: boolean
}

const STORAGE_KEY = 'gostudiom_quick_start_progress'

const defaultProgress: QuickStartProgress = {
  currentStep: 1,
  completedSteps: [],
  startedAt: new Date().toISOString(),
}

export function useQuickStartProgress() {
  const [progress, setProgress] = useState<QuickStartProgress>(defaultProgress)
  const [isLoading, setIsLoading] = useState(true)

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as QuickStartProgress
        setProgress(parsed)
      }
    } catch (error) {
      console.error('Failed to load quick start progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save progress to localStorage whenever it changes
  const saveProgress = useCallback((newProgress: QuickStartProgress) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress))
      setProgress(newProgress)
    } catch (error) {
      console.error('Failed to save quick start progress:', error)
    }
  }, [])

  const completeStep = useCallback((stepId: string) => {
    const newProgress = {
      ...progress,
      completedSteps: [...new Set([...progress.completedSteps, stepId])],
    }
    
    // Auto-advance to next step if current step is completed
    const currentStepId = `step-${progress.currentStep}`
    if (stepId === currentStepId && progress.currentStep < 5) {
      newProgress.currentStep = progress.currentStep + 1
    }
    
    // Check if all steps are completed
    if (newProgress.completedSteps.length === 4) { // 4 main steps
      newProgress.completedAt = new Date().toISOString()
      newProgress.currentStep = 5 // Completion step
    }
    
    saveProgress(newProgress)
  }, [progress, saveProgress])

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > 5) return
    
    // Can only go to completed steps or the next step
    const canNavigate = stepNumber <= progress.completedSteps.length + 1 || stepNumber <= progress.currentStep
    if (!canNavigate) return
    
    saveProgress({
      ...progress,
      currentStep: stepNumber,
    })
  }, [progress, saveProgress])

  const resetProgress = useCallback(() => {
    const newProgress = {
      ...defaultProgress,
      startedAt: new Date().toISOString(),
    }
    saveProgress(newProgress)
  }, [saveProgress])

  const skipQuickStart = useCallback(() => {
    const newProgress = {
      ...progress,
      skipped: true,
      completedAt: new Date().toISOString(),
    }
    saveProgress(newProgress)
  }, [progress, saveProgress])

  const isStepCompleted = useCallback((stepId: string) => {
    return progress.completedSteps.includes(stepId)
  }, [progress.completedSteps])

  const calculatePercentage = useCallback(() => {
    return Math.round((progress.completedSteps.length / 4) * 100)
  }, [progress.completedSteps])

  return {
    progress,
    isLoading,
    completeStep,
    goToStep,
    resetProgress,
    skipQuickStart,
    isStepCompleted,
    calculatePercentage,
    isCompleted: !!progress.completedAt || !!progress.skipped,
  }
}