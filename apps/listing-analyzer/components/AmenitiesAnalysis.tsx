'use client'

import { Home, Wifi, Car, Coffee, Tv, Wind, Droplets, UtensilsCrossed, WashingMachine, Dumbbell, Trees, Shield, Check, X, Plus } from 'lucide-react'
import { useState } from 'react'

interface AmenitiesAnalysisProps {
  amenities: string[]
  propertyType: string
  competitorAmenities?: string[]
}

// Essential amenities that guests expect
const ESSENTIAL_AMENITIES = [
  'Wifi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating', 
  'Dedicated workspace', 'TV', 'Hair dryer', 'Iron', 'Essentials',
  'Hangers', 'Shampoo', 'Hot water', 'Coffee maker', 'Microwave',
  'Refrigerator', 'Dishes and silverware', 'Cooking basics', 'Parking'
]

// Premium amenities that can justify higher prices
const PREMIUM_AMENITIES = [
  'Pool', 'Hot tub', 'EV charger', 'Gym', 'Sauna', 'Beach access',
  'Waterfront', 'Balcony', 'Patio', 'BBQ grill', 'Fire pit', 
  'Piano', 'Game room', 'Home theater', 'Wine cooler', 'Espresso machine'
]

// Safety amenities
const SAFETY_AMENITIES = [
  'Smoke alarm', 'Carbon monoxide alarm', 'Fire extinguisher', 
  'First aid kit', 'Security cameras', 'Lock on bedroom door'
]

// Family amenities
const FAMILY_AMENITIES = [
  'Crib', 'High chair', 'Baby bath', 'Baby monitor', 'Outlet covers',
  'Baby gates', 'Children\'s books and toys', 'Pack \'n play'
]

// Remote work amenities
const WORK_AMENITIES = [
  'Dedicated workspace', 'Wifi', 'Laptop-friendly workspace', 
  'Ergonomic chair', 'Monitor', 'Printer', 'Office supplies'
]

export default function AmenitiesAnalysis({ 
  amenities, 
  propertyType,
  competitorAmenities = []
}: AmenitiesAnalysisProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Normalize amenities for comparison
  const normalizedAmenities = amenities.map(a => a.toLowerCase())
  
  // Categorize amenities
  const hasEssential = ESSENTIAL_AMENITIES.filter(a => 
    normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  const missingEssential = ESSENTIAL_AMENITIES.filter(a => 
    !normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  
  const hasPremium = PREMIUM_AMENITIES.filter(a => 
    normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  const missedPremiumOpportunities = PREMIUM_AMENITIES.filter(a => 
    !normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  ).slice(0, 5) // Top 5 opportunities
  
  const hasSafety = SAFETY_AMENITIES.filter(a => 
    normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  const missingSafety = SAFETY_AMENITIES.filter(a => 
    !normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  
  const hasFamily = FAMILY_AMENITIES.filter(a => 
    normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  
  const hasWork = WORK_AMENITIES.filter(a => 
    normalizedAmenities.some(na => na.includes(a.toLowerCase()))
  )
  
  // Calculate scores
  const essentialScore = (hasEssential.length / ESSENTIAL_AMENITIES.length) * 100
  const safetyScore = (hasSafety.length / SAFETY_AMENITIES.length) * 100
  const premiumScore = hasPremium.length > 0 ? (hasPremium.length / 5) * 100 : 0 // Score based on having at least 5 premium
  
  // Icon mapping for visual appeal
  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase()
    if (lower.includes('wifi')) return <Wifi className="w-4 h-4" />
    if (lower.includes('parking') || lower.includes('car')) return <Car className="w-4 h-4" />
    if (lower.includes('coffee') || lower.includes('espresso')) return <Coffee className="w-4 h-4" />
    if (lower.includes('tv') || lower.includes('theater')) return <Tv className="w-4 h-4" />
    if (lower.includes('air') || lower.includes('heating')) return <Wind className="w-4 h-4" />
    if (lower.includes('pool') || lower.includes('tub') || lower.includes('water')) return <Droplets className="w-4 h-4" />
    if (lower.includes('kitchen') || lower.includes('cooking')) return <UtensilsCrossed className="w-4 h-4" />
    if (lower.includes('washer') || lower.includes('dryer')) return <WashingMachine className="w-4 h-4" />
    if (lower.includes('gym') || lower.includes('exercise')) return <Dumbbell className="w-4 h-4" />
    if (lower.includes('garden') || lower.includes('outdoor')) return <Trees className="w-4 h-4" />
    if (lower.includes('alarm') || lower.includes('security')) return <Shield className="w-4 h-4" />
    return <Home className="w-4 h-4" />
  }

  return (
    <div className="space-y-8">
      {/* Score Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Essential Coverage</h3>
          <div className="relative h-32 flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${essentialScore * 3.52} 352`}
                className="text-blue-500"
              />
            </svg>
            <div className="absolute">
              <div className="text-2xl font-bold">{Math.round(essentialScore)}%</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {hasEssential.length} of {ESSENTIAL_AMENITIES.length} essentials
          </p>
          {essentialScore < 70 && (
            <p className="text-xs text-red-600 mt-2">⚠️ Missing key amenities</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Safety Features</h3>
          <div className="relative h-32 flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${safetyScore * 3.52} 352`}
                className="text-green-500"
              />
            </svg>
            <div className="absolute">
              <div className="text-2xl font-bold">{Math.round(safetyScore)}%</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {hasSafety.length} of {SAFETY_AMENITIES.length} safety items
          </p>
          {safetyScore < 60 && (
            <p className="text-xs text-orange-600 mt-2">⚠️ Add safety features</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Premium Features</h3>
          <div className="relative h-32 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-500">{hasPremium.length}</div>
              <p className="text-sm text-gray-600 mt-2">premium amenities</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {hasPremium.length > 3 ? '✨ Great differentiator!' : 'Room to stand out'}
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'essential', 'safety', 'premium', 'family', 'work'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === cat 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Current Amenities */}
        <div className="mb-8">
          <h4 className="font-semibold mb-4">Your Current Amenities ({amenities.length})</h4>
          <div className="flex flex-wrap gap-2">
            {(selectedCategory === 'all' ? amenities :
              selectedCategory === 'essential' ? hasEssential :
              selectedCategory === 'safety' ? hasSafety :
              selectedCategory === 'premium' ? hasPremium :
              selectedCategory === 'family' ? hasFamily :
              hasWork
            ).map((amenity, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
                {getAmenityIcon(amenity)}
                <span>{amenity}</span>
                <Check className="w-3 h-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Missing Essential Amenities */}
        {missingEssential.length > 0 && selectedCategory === 'essential' && (
          <div className="mb-8">
            <h4 className="font-semibold mb-4 text-red-600">Missing Essential Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {missingEssential.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                  <X className="w-3 h-3" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium Opportunities */}
        {selectedCategory === 'premium' && (
          <div className="mb-8">
            <h4 className="font-semibold mb-4 text-purple-600">Premium Opportunities</h4>
            <p className="text-sm text-gray-600 mb-4">
              Adding these could justify 10-20% higher nightly rates:
            </p>
            <div className="flex flex-wrap gap-2">
              {missedPremiumOpportunities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm">
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                  <Plus className="w-3 h-3" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Amenity Optimization Strategy</h3>
        <div className="space-y-4">
          {missingEssential.length > 0 && (
            <div className="p-4 bg-white rounded-lg border-l-4 border-red-500">
              <h4 className="font-medium text-red-900 mb-2">Priority 1: Add Essential Amenities</h4>
              <p className="text-sm text-gray-700 mb-2">
                You're missing {missingEssential.length} essential amenities that guests expect:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingEssential.slice(0, 5).map((a, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {missingSafety.length > 0 && (
            <div className="p-4 bg-white rounded-lg border-l-4 border-orange-500">
              <h4 className="font-medium text-orange-900 mb-2">Priority 2: Enhance Safety</h4>
              <p className="text-sm text-gray-700">
                Add {missingSafety.slice(0, 3).join(', ')} to improve guest confidence and meet platform requirements.
              </p>
            </div>
          )}
          
          {hasPremium.length < 3 && (
            <div className="p-4 bg-white rounded-lg border-l-4 border-purple-500">
              <h4 className="font-medium text-purple-900 mb-2">Priority 3: Stand Out with Premium Features</h4>
              <p className="text-sm text-gray-700">
                Consider adding {missedPremiumOpportunities.slice(0, 2).join(' or ')} to differentiate your listing and justify premium pricing.
              </p>
            </div>
          )}
          
          {hasWork.length < 3 && (
            <div className="p-4 bg-white rounded-lg border-l-4 border-blue-500">
              <h4 className="font-medium text-blue-900 mb-2">Opportunity: Target Remote Workers</h4>
              <p className="text-sm text-gray-700">
                Add dedicated workspace amenities to attract the growing remote work market.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}