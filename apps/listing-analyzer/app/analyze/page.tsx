'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ScoreDisplay from '@/components/ScoreDisplay'
import RecommendationCard from '@/components/RecommendationCard'
import ReviewAnalytics from '@/components/ReviewAnalytics'
import AmenitiesAnalysis from '@/components/AmenitiesAnalysis'
import PricingInsights from '@/components/PricingInsights'
import CompetitorComparison from '@/components/CompetitorComparison'
import HostMetrics from '@/components/HostMetrics'
import UpgradePrompt from '@/components/UpgradePrompt'
import { ArrowLeft, Download, Share2, RefreshCw, TrendingUp, AlertCircle, Star, DollarSign, Home, Users, Calendar, Shield } from 'lucide-react'
import type { ComprehensiveAirbnbListing } from '@/lib/types/listing'
import type { AnalysisResult } from '@/lib/analyzer'

export default function AnalyzePage() {
  const router = useRouter()
  const [listing, setListing] = useState<ComprehensiveAirbnbListing | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Get results from sessionStorage
    const storedResults = sessionStorage.getItem('analysis_results')
    if (storedResults) {
      const data = JSON.parse(storedResults)
      setListing(data.data || data.listing)
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

  if (!listing) {
    return null
  }

  // Calculate key metrics
  const reviewScore = listing.reviews?.summary?.rating || 0
  const reviewCount = listing.reviews?.summary?.totalCount || 0
  const amenityCount = listing.amenities?.basic?.length || 0
  const photoCount = listing.photos?.length || 0
  const basePrice = listing.pricing?.basePrice || 0
  const cleaningFee = listing.pricing?.cleaningFee || 0
  
  // Review category scores
  const reviewCategories = listing.reviews?.summary?.categories || {}
  const reviewDistribution = listing.reviews?.summary?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

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
            
            {/* Logo in center */}
            <div className="flex-1 flex justify-center">
              <Image
                src="/images/gostudiom-logo.png"
                alt="GoStudioM - Built for hosts, by a host"
                width={250}
                height={60}
                className="h-10 w-auto"
                priority
              />
            </div>
            
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
        {/* Listing Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <span className="flex items-center gap-1">
              <Home className="w-4 h-4" />
              {listing.propertyType}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ${basePrice}/night
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {reviewScore.toFixed(2)}★ ({reviewCount} reviews)
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {listing.guestCapacity?.total || 4} guests · {listing.spaces?.bedrooms || 1} bed · {listing.spaces?.bathrooms || 1} bath
            </span>
            {listing.host?.isSuperhost && (
              <span className="flex items-center gap-1 text-red-500">
                <Shield className="w-4 h-4" />
                Superhost
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'amenities', label: 'Amenities', icon: Home },
            { id: 'pricing', label: 'Pricing', icon: DollarSign },
            { id: 'host', label: 'Host', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Overall Score</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{analysis?.score || 75}/100</div>
                <div className="text-xs text-gray-500 mt-1">Above Average</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Data Quality</span>
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{listing.meta?.dataCompleteness || 0}%</div>
                <div className="text-xs text-gray-500 mt-1">Coverage</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Photos</span>
                  <Home className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{photoCount}</div>
                <div className="text-xs text-gray-500 mt-1">High Quality</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Response Rate</span>
                  <Users className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold">{listing.host?.responseRate || 'N/A'}%</div>
                <div className="text-xs text-gray-500 mt-1">{listing.host?.responseTime || 'Unknown'}</div>
              </div>
            </div>

            {/* Score Display */}
            {analysis && (
              <ScoreDisplay 
                score={analysis.score} 
                summary={analysis.summary} 
                categories={analysis.categories} 
              />
            )}

            {/* Top Recommendations */}
            {analysis?.recommendations && (
              <div>
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
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewAnalytics 
            rating={reviewScore}
            totalCount={reviewCount}
            distribution={reviewDistribution}
            categories={reviewCategories}
            recentReviews={listing.reviews?.recentReviews || []}
          />
        )}

        {activeTab === 'amenities' && (
          <AmenitiesAnalysis 
            amenities={listing.amenities?.basic || []}
            propertyType={listing.propertyType}
            competitorAmenities={[]} // Could be populated with competitor data
          />
        )}

        {activeTab === 'pricing' && (
          <PricingInsights 
            basePrice={basePrice}
            cleaningFee={cleaningFee}
            serviceFee={listing.pricing?.serviceFee}
            weeklyDiscount={listing.pricing?.weeklyDiscount}
            monthlyDiscount={listing.pricing?.monthlyDiscount}
            guestCapacity={listing.guestCapacity?.total || 4}
            bedrooms={listing.spaces?.bedrooms || 1}
          />
        )}

        {activeTab === 'host' && (
          <HostMetrics 
            host={listing.host}
            cancellationPolicy={listing.cancellationPolicy}
            houseRules={listing.houseRules}
            safetyFeatures={listing.amenities?.safety || []}
          />
        )}

        {/* Description Analysis */}
        {listing.description && (
          <div className="mt-12 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📝 Description Analysis
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Description</h4>
                <p className="text-gray-600 text-sm line-clamp-6">
                  {listing.description}
                </p>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">
                    Word count: {listing.description.split(' ').length}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Key Sections Found</h4>
                <ul className="space-y-2">
                  {listing.descriptionSections && Object.entries(listing.descriptionSections).map(([key, value]) => (
                    <li key={key} className="flex items-center text-sm">
                      <span className={`w-2 h-2 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {value && <span className="ml-auto text-green-600">✓</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Prompts */}
        <UpgradePrompt />
      </div>
    </div>
  )
}