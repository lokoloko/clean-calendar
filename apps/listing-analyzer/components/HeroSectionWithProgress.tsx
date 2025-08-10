'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Sparkles, TrendingUp, Clock } from 'lucide-react'
import AnalysisProgress from '@/components/AnalysisProgress'

export default function HeroSectionWithProgress() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [currentStage, setCurrentStage] = useState('fetch')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  useState(() => {
    setMounted(true)
  })

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url) {
      setError('Please enter an Airbnb URL')
      return
    }

    setError('')
    setIsAnalyzing(true)
    setCurrentStage('fetch')
    setProgress(0)
    setStatusMessage('Initializing analysis...')

    try {
      // Use Server-Sent Events for real-time updates
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'status') {
                // Map stages to our UI
                const stageMap: Record<string, string> = {
                  'initializing': 'fetch',
                  'fetching': 'fetch',
                  'extracting': 'extract',
                  'analyzing': 'analyze',
                  'finalizing': 'optimize',
                  'done': 'complete'
                }
                
                setCurrentStage(stageMap[data.stage] || 'fetch')
                setProgress(data.progress || 0)
                setStatusMessage(data.message)
                
                // Show details if available
                if (data.details) {
                  console.log('Analysis details:', data.details)
                }
              } else if (data.type === 'complete') {
                // Store results and navigate
                sessionStorage.setItem('analysis_results', JSON.stringify({
                  data: data.data.listing,
                  analysis: data.data.analysis,
                  metrics: data.data.metrics
                }))
                router.push('/analyze')
                return
              } else if (data.type === 'error') {
                setError(data.message || 'Analysis failed')
                setIsAnalyzing(false)
                return
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Analysis error:', err)
      setIsAnalyzing(false)
    }
  }

  if (isAnalyzing) {
    return (
      <AnalysisProgress 
        currentStage={currentStage}
        progress={progress}
        message={statusMessage}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/gostudiom-logo.png"
            alt="GoStudioM - Built for hosts, by a host"
            width={400}
            height={100}
            className="h-20 w-auto"
            priority
          />
        </div>
        
        {/* Hero Content */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-6">
            {mounted && <Sparkles className="w-4 h-4 mr-2" />}
            AI-Powered Analysis
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Boost Your Airbnb
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Bookings</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Get instant, actionable recommendations to optimize your listing and increase revenue. 
            Powered by AI that analyzes thousands of successful properties.
          </p>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 mb-12">
            <div className="flex items-center text-gray-700">
              {mounted && <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />}
              <span className="font-medium">100% Free</span>
            </div>
            <div className="flex items-center text-gray-700">
              {mounted && <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />}
              <span className="font-medium">No Signup Required</span>
            </div>
            <div className="flex items-center text-gray-700">
              {mounted && <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />}
              <span className="font-medium">Real-Time Updates</span>
            </div>
          </div>
        </div>

        {/* URL Input Form */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleAnalyze} className="relative">
            <div className="relative rounded-2xl shadow-xl bg-white p-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your Airbnb listing URL here..."
                className="w-full px-6 py-4 pr-32 text-lg rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Analyze Now
                {mounted && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
            
            <p className="text-gray-500 text-sm mt-3 text-center">
              Example: https://www.airbnb.com/rooms/123456789
            </p>
          </form>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {mounted && <Sparkles className="w-8 h-8 text-blue-600" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Advanced algorithms analyze your listing against top performers
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {mounted && <TrendingUp className="w-8 h-8 text-purple-600" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Progress Updates</h3>
            <p className="text-gray-600">
              See exactly what's happening with real-time status updates
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {mounted && <Clock className="w-8 h-8 text-green-600" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">Complete Analysis</h3>
            <p className="text-gray-600">
              Thorough 45-second analysis for actionable recommendations
            </p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-20">
          <p className="text-gray-500 text-sm">
            Trusted by <span className="font-semibold text-gray-700">1,000+</span> Airbnb hosts worldwide
          </p>
        </div>
      </div>
    </div>
  )
}