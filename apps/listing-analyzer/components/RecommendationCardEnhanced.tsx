'use client'

import { TrendingUp, Clock, DollarSign, AlertCircle, ChevronRight, Zap, Target } from 'lucide-react'
import type { EnhancedRecommendation } from '@/lib/analyzer-enhanced'

interface RecommendationCardEnhancedProps {
  recommendation: EnhancedRecommendation
  index: number
}

export default function RecommendationCardEnhanced({ 
  recommendation, 
  index 
}: RecommendationCardEnhancedProps) {
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEffortColor = (effort: string) => {
    switch(effort) {
      case 'quick-win': return 'text-green-600'
      case 'easy': return 'text-blue-600'
      case 'medium': return 'text-yellow-600'
      case 'hard': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getEffortIcon = (effort: string) => {
    if (effort === 'quick-win') return '⚡'
    if (effort === 'easy') return '✓'
    if (effort === 'medium') return '⚙️'
    return '💪'
  }

  return (
    <div className={`border-l-4 rounded-lg p-6 ${getPriorityColor(recommendation.priority)} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-lg">
            {index}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {recommendation.title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(recommendation.priority)}`}>
                {recommendation.priority.toUpperCase()}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {recommendation.category}
              </span>
            </div>
            
            <p className="text-gray-700 mb-4">
              {recommendation.description}
            </p>

            {/* Impact Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-xs text-gray-500">Bookings</div>
                  <div className="font-semibold text-green-600">{recommendation.impact.bookings}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-xs text-gray-500">Revenue</div>
                  <div className="font-semibold text-green-600">{recommendation.impact.revenue}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs text-gray-500">Rating</div>
                  <div className="font-semibold text-blue-600">{recommendation.impact.rating}</div>
                </div>
              </div>
            </div>

            {/* Implementation Details */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <span className={getEffortColor(recommendation.effort)}>
                  {getEffortIcon(recommendation.effort)}
                </span>
                <span className="text-gray-600">Effort:</span>
                <span className={`font-medium ${getEffortColor(recommendation.effort)}`}>
                  {recommendation.effort.replace('-', ' ')}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{recommendation.timeframe}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Cost:</span>
                <span className="font-medium">{recommendation.cost}</span>
              </div>
            </div>

            {/* Quick Win Badge */}
            {recommendation.effort === 'quick-win' && (
              <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <Zap className="w-3 h-3" />
                Quick Win - Implement Today!
              </div>
            )}
          </div>
        </div>

        <button className="flex-shrink-0 p-2 hover:bg-white rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}