'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target, DollarSign } from 'lucide-react'
import type { EnhancedAnalysisResult } from '@/lib/analyzer-enhanced'

interface ScoreDisplayEnhancedProps {
  analysis: EnhancedAnalysisResult
}

export default function ScoreDisplayEnhanced({ analysis }: ScoreDisplayEnhancedProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPositionBadge = (position: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      'leader': { bg: 'bg-green-100', text: 'text-green-800', icon: TrendingUp },
      'above-average': { bg: 'bg-blue-100', text: 'text-blue-800', icon: TrendingUp },
      'average': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      'below-average': { bg: 'bg-orange-100', text: 'text-orange-800', icon: TrendingDown },
      'needs-work': { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle }
    }
    return badges[position] || badges['average']
  }

  const positionBadge = getPositionBadge(analysis.competitivePosition)

  return (
    <div className="space-y-8">
      {/* Main Score Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Listing Analysis Complete</h2>
              <p className="text-blue-100">{analysis.summary}</p>
            </div>
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                <span className="text-white">{analysis.score}</span>
              </div>
              <div className="text-sm text-blue-100 mt-2">out of 100</div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className={`px-4 py-2 rounded-full ${positionBadge.bg} ${positionBadge.text} flex items-center gap-2`}>
              <positionBadge.icon className="w-4 h-4" />
              {analysis.competitivePosition.replace('-', ' ').toUpperCase()}
            </span>
            {analysis.competitiveAdvantages.length > 0 && (
              <span className="text-sm text-gray-600">
                {analysis.competitiveAdvantages.length} competitive advantages
              </span>
            )}
          </div>

          {/* Category Scores Grid */}
          <div className="grid md:grid-cols-4 gap-4">
            {Object.entries(analysis.categories).map(([key, category]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{key}</span>
                  {category.score >= 80 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : category.score >= 60 ? (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="text-2xl font-bold">{category.score}</div>
                <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      category.score >= 80 ? 'bg-green-500' :
                      category.score >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${category.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Insights */}
      {analysis.marketInsights && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Market Positioning & Optimization
          </h3>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <span className="text-sm text-gray-600">Optimal Price</span>
              <div className="text-2xl font-bold text-green-600">
                ${analysis.marketInsights.optimalPrice}
              </div>
              <span className="text-xs text-gray-500">per night</span>
            </div>
            
            <div className="p-4 border rounded-lg">
              <span className="text-sm text-gray-600">Target Occupancy</span>
              <div className="text-2xl font-bold">
                {analysis.marketInsights.targetOccupancy}%
              </div>
              <span className="text-xs text-gray-500">monthly average</span>
            </div>
            
            <div className="p-4 border rounded-lg">
              <span className="text-sm text-gray-600">Weekly Discount</span>
              <div className="text-2xl font-bold">
                {analysis.marketInsights.suggestedDiscounts.weekly}%
              </div>
              <span className="text-xs text-gray-500">recommended</span>
            </div>
            
            <div className="p-4 border rounded-lg">
              <span className="text-sm text-gray-600">Peak Season</span>
              <div className="text-2xl font-bold">
                {((analysis.marketInsights.peakSeasonMultiplier - 1) * 100).toFixed(0)}%
              </div>
              <span className="text-xs text-gray-500">price increase</span>
            </div>
          </div>
        </div>
      )}

      {/* Guest Persona */}
      {analysis.guestPersona && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">🎯 Target Guest Profile</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Primary Type</h4>
              <p className="text-lg font-semibold">{analysis.guestPersona.primaryType}</p>
            </div>
            <div>
              <h4 className="font-medium text-purple-900 mb-2">What They Want</h4>
              <ul className="space-y-1">
                {analysis.guestPersona.preferences.map((pref, i) => (
                  <li key={i} className="text-sm text-gray-700">• {pref}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Pain Points to Address</h4>
              <ul className="space-y-1">
                {analysis.guestPersona.painPoints.map((pain, i) => (
                  <li key={i} className="text-sm text-gray-700">• {pain}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Risks and Opportunities */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Factors */}
        {analysis.riskFactors.length > 0 && (
          <div className="bg-red-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Risk Factors
            </h3>
            <ul className="space-y-2">
              {analysis.riskFactors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">⚠</span>
                  <span className="text-sm text-red-800">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {analysis.opportunities.length > 0 && (
          <div className="bg-green-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Growth Opportunities
            </h3>
            <ul className="space-y-2">
              {analysis.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-sm text-green-800">{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Competitive Advantages */}
      {analysis.competitiveAdvantages.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">💪 Your Competitive Advantages</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {analysis.competitiveAdvantages.map((advantage, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-blue-800">{advantage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improved Content Suggestions */}
      {analysis.improvedContent && analysis.improvedContent.title && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold mb-4">✨ Optimized Content Suggestions</h3>
          
          {analysis.improvedContent.title && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Suggested Title</h4>
              <p className="text-lg font-semibold text-gray-900 p-3 bg-gray-50 rounded-lg">
                {analysis.improvedContent.title}
              </p>
            </div>
          )}
          
          {analysis.improvedContent.highlights && analysis.improvedContent.highlights.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Key Highlights to Feature</h4>
              <ul className="space-y-2">
                {analysis.improvedContent.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="text-blue-500">★</span>
                    <span className="text-sm">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}