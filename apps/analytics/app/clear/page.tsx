'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
// Removed lucide-react imports to avoid hydration issues

export default function ClearDataPage() {
  const router = useRouter()
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)
  
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return
    }
    
    setClearing(true)
    
    try {
      // Clear session data via API
      const response = await fetch('/api/clear-data', {
        method: 'POST',
        credentials: 'same-origin'
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear session data')
      }
      
      // Clear sessionStorage as well
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }
      
      setCleared(true)
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (error) {
      console.error('Error clearing data:', error)
      alert('Failed to clear data. Please try again.')
    } finally {
      setClearing(false)
    }
  }
  
  const handleStartFresh = () => {
    router.push('/')
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <GoStudioMLogo className="mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Clear All Data
          </h1>
          <p className="text-lg text-gray-600">
            Remove all stored properties and start fresh
          </p>
        </div>
        
        {!cleared ? (
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
                <CardTitle>Warning: This Action Cannot Be Undone</CardTitle>
              </div>
              <CardDescription>
                This will permanently delete:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  All uploaded property data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  All property URLs and mappings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  All scraped Airbnb data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  All AI-generated insights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  All session data and preferences
                </li>
              </ul>
              
              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="flex-1"
                >
                  {clearing ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                      </svg>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" x2="10" y1="11" y2="17"></line>
                        <line x1="14" x2="14" y1="11" y2="17"></line>
                      </svg>
                      Clear All Data
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={clearing}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-green-600">
                All Data Cleared Successfully
              </CardTitle>
              <CardDescription>
                Your analytics dashboard has been reset. You can now start fresh with new data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleStartFresh}
                className="w-full"
              >
                Start Fresh
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Having issues with duplicate data?
          </p>
          <p className="text-sm text-gray-500">
            This tool helps you reset and start over cleanly.
          </p>
        </div>
      </div>
    </div>
  )
}