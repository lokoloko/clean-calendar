'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScoreDisplay from '@/components/ScoreDisplay'
import RecommendationCard from '@/components/RecommendationCard'
import UpgradePrompt from '@/components/UpgradePrompt'
import { ArrowLeft, Download, Share2, RefreshCw } from 'lucide-react'
import type { ListingData } from '@/lib/scraper'
import type { AnalysisResult } from '@/lib/analyzer'

export default function AnalyzePage() {
  const router = useRouter()
  const [listing, setListing] = useState<ListingData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get results from sessionStorage
    const storedResults = sessionStorage.getItem('analysis_results')
    if (storedResults) {
      const data = JSON.parse(storedResults)
      setListing(data.listing)
      setAnalysis(data.analysis)
    } else {
      // No results, redirect to home
      router.push('/')
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (!listing || !analysis) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Analyze Another
            </button>
            
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Download Report">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Share Results">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg" 
                title="Re-analyze"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Listing Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <p className="text-gray-600">
            {listing.propertyType} · {listing.location.neighborhood || listing.location.city || 'Location'} · 
            ${listing.pricing.nightly}/night · 
            {listing.reviews.rating}★ ({listing.reviews.count} reviews)
          </p>
        </div>

        {/* Score Display */}
        <ScoreDisplay score={analysis.score} summary={analysis.summary} categories={analysis.categories} />

        {/* Top Recommendations */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Top {analysis.recommendations.length} Recommendations
          </h2>
          
          <div className="space-y-4">
            {analysis.recommendations.map((rec, index) => (
              <RecommendationCard 
                key={rec.id} 
                recommendation={rec} 
                index={index + 1}
              />
            ))}
          </div>
        </div>

        {/* Improved Description */}
        {analysis.improvedDescription && (
          <div className="mt-12 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ✍️ Optimized Description
            </h3>
            <p className="text-gray-600 mb-4">
              Here's a rewritten description optimized for more bookings:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="whitespace-pre-wrap">{analysis.improvedDescription}</p>
            </div>
            <button className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
              Copy to Clipboard →
            </button>
          </div>
        )}

        {/* Detailed Metrics */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Metrics</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Photos</dt>
                <dd className="font-medium">{listing.photos.count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Amenities</dt>
                <dd className="font-medium">{listing.amenities.all.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Superhost</dt>
                <dd className="font-medium">{listing.host.isSuperhost ? 'Yes ✓' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Instant Book</dt>
                <dd className="font-medium">{listing.availability.instantBook ? 'Yes ✓' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Min Stay</dt>
                <dd className="font-medium">{listing.availability.minimumStay || 1} nights</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Missing Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {['Workspace', 'Coffee maker', 'Fast wifi', 'Hair dryer', 'Iron', 'TV', 'Parking']
                .filter(a => !listing.amenities.all.some(la => la.toLowerCase().includes(a.toLowerCase())))
                .map(amenity => (
                  <span key={amenity} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Upgrade Prompts */}
        <UpgradePrompt />
      </div>
    </div>
  )
}