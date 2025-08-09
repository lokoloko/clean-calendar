'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import * as Icons from 'lucide-react'

export default function HeroSection() {
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate URL
    if (!url) {
      setError('Please enter your Airbnb listing URL')
      return
    }

    if (!url.includes('airbnb.com/rooms/') && !url.includes('airbnb.com/h/')) {
      setError('Please enter a valid Airbnb listing URL (e.g., airbnb.com/rooms/123456)')
      return
    }

    setIsAnalyzing(true)

    try {
      // Call analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (data.success) {
        // Store results in sessionStorage and navigate
        sessionStorage.setItem('analysis_results', JSON.stringify(data))
        router.push('/analyze')
      } else {
        setError(data.error || 'Failed to analyze listing')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }
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
            {mounted && <Icons.Sparkles className="w-4 h-4 mr-2" />}
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
              {mounted && <Icons.CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />}
              <span className="font-medium">100% Free</span>
            </div>
            <div className="flex items-center text-gray-700">
              {mounted && <Icons.CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />}
              <span className="font-medium">No Signup Required</span>
            </div>
            <div className="flex items-center text-gray-700">
              {mounted && <Icons.CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />}
              <span className="font-medium">Results in 30 Seconds</span>
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
                {isAnalyzing ? (
                  <>
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Now
                    {mounted && <Icons.ArrowRight className="w-5 h-5" />}
                  </>
                )}
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
              {mounted && <Icons.Sparkles className="w-8 h-8 text-blue-600" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Advanced algorithms analyze your listing against top performers
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {mounted && <Icons.TrendingUp className="w-8 h-8 text-purple-600" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">Actionable Recommendations</h3>
            <p className="text-gray-600">
              Get specific steps to improve bookings with impact estimates
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {mounted && <Icons.Clock className="w-8 h-8 text-green-600" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
            <p className="text-gray-600">
              Complete analysis in under 30 seconds, no waiting required
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