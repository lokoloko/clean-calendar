import { TrendingUp, Clock, Zap } from 'lucide-react'
import type { Recommendation } from '@/lib/analyzer'

interface RecommendationCardProps {
  recommendation: Recommendation
  index: number
}

export default function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'easy': return <Zap className="w-4 h-4 text-green-600" />
      case 'medium': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return <Clock className="w-4 h-4 text-red-600" />
    }
  }

  const getCategoryEmoji = (category: string) => {
    switch (category.toLowerCase()) {
      case 'photos': return '📸'
      case 'description': return '✍️'
      case 'amenities': return '🏠'
      case 'reviews': return '⭐'
      case 'pricing': return '💰'
      case 'host status': return '👑'
      case 'booking settings': return '⚙️'
      default: return '💡'
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${
      recommendation.priority === 'critical' ? 'border-red-500' :
      recommendation.priority === 'high' ? 'border-orange-500' :
      recommendation.priority === 'medium' ? 'border-yellow-500' :
      'border-gray-300'
    } p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{getCategoryEmoji(recommendation.category)}</span>
            <span className="text-3xl font-bold text-gray-400">#{index}</span>
            <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority}
            </span>
          </div>
          
          <p className="text-gray-600 mb-4">{recommendation.description}</p>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Impact: {recommendation.impact}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {getEffortIcon(recommendation.effort)}
              <span className="text-sm text-gray-500">Effort: {recommendation.effort}</span>
            </div>
            
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              {recommendation.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}