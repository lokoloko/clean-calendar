import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface ScoreDisplayProps {
  score: number
  summary: string
  categories: {
    photos: { score: number; issue?: string }
    description: { score: number; issue?: string }
    amenities: { score: number; issue?: string }
    reviews: { score: number; issue?: string }
    pricing: { score: number; issue?: string }
  }
}

export default function ScoreDisplay({ score, summary, categories }: ScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600'
    if (score >= 60) return 'from-yellow-500 to-yellow-600'
    return 'from-red-500 to-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />
    if (score >= 60) return <AlertCircle className="w-5 h-5" />
    return <XCircle className="w-5 h-5" />
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* Main Score */}
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center">
          <div className={`absolute inset-0 bg-gradient-to-r ${getScoreBg(score)} rounded-full blur-2xl opacity-20`} />
          <div className="relative">
            <div className={`text-7xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-gray-500 text-sm mt-1">out of 100</div>
          </div>
        </div>
        
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{summary}</p>
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-5 gap-4 pt-6 border-t">
        {Object.entries(categories).map(([key, data]) => (
          <div key={key} className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className={getScoreColor(data.score)}>
                {getScoreIcon(data.score)}
              </span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
              {data.score}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-1">{key}</div>
            {data.issue && (
              <div className="text-xs text-red-600 mt-1" title={data.issue}>
                ⚠️
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}