'use client'

import { Star, TrendingUp, TrendingDown, Users, MessageSquare } from 'lucide-react'

interface ReviewAnalyticsProps {
  rating: number
  totalCount: number
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  categories: {
    cleanliness?: number
    accuracy?: number
    checkin?: number
    communication?: number
    location?: number
    value?: number
  }
  recentReviews: Array<{
    author: string
    date: string
    text: string
    rating?: number
  }>
}

export default function ReviewAnalytics({
  rating,
  totalCount,
  distribution,
  categories,
  recentReviews
}: ReviewAnalyticsProps) {
  // Calculate average of category scores
  const categoryScores = Object.values(categories).filter(v => v && v > 0)
  const avgCategoryScore = categoryScores.length > 0 
    ? categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length 
    : 0

  // Identify weak points (scores below 4.7)
  const weakCategories = Object.entries(categories)
    .filter(([_, score]) => score && score < 4.7)
    .sort((a, b) => (a[1] || 0) - (b[1] || 0))

  // Calculate sentiment from recent reviews
  const positiveKeywords = ['great', 'excellent', 'amazing', 'wonderful', 'perfect', 'loved', 'beautiful', 'clean', 'comfortable', 'spacious']
  const negativeKeywords = ['dirty', 'broken', 'uncomfortable', 'small', 'noisy', 'bad', 'terrible', 'awful', 'disappointed']
  
  let positiveMentions = 0
  let negativeMentions = 0
  
  recentReviews.forEach(review => {
    const text = review.text.toLowerCase()
    positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) positiveMentions++
    })
    negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) negativeMentions++
    })
  })

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Overall Rating</h3>
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold mb-2">{rating.toFixed(2)}</div>
          <div className="text-sm text-gray-600">out of 5.0 stars</div>
          <div className="mt-4 text-sm">
            <span className={`font-medium ${rating >= 4.8 ? 'text-green-600' : rating >= 4.5 ? 'text-yellow-600' : 'text-red-600'}`}>
              {rating >= 4.8 ? 'Excellent' : rating >= 4.5 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Review Volume</h3>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold mb-2">{totalCount}</div>
          <div className="text-sm text-gray-600">total reviews</div>
          <div className="mt-4 text-sm">
            {totalCount >= 100 ? (
              <span className="text-green-600 font-medium">High credibility</span>
            ) : totalCount >= 30 ? (
              <span className="text-yellow-600 font-medium">Building trust</span>
            ) : (
              <span className="text-orange-600 font-medium">Need more reviews</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sentiment</h3>
            <MessageSquare className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold mb-2">
            {positiveMentions > negativeMentions * 2 ? '😊' : positiveMentions > negativeMentions ? '🙂' : '😟'}
          </div>
          <div className="text-sm text-gray-600">
            {positiveMentions} positive / {negativeMentions} negative
          </div>
          <div className="mt-4 text-sm">
            <span className={`font-medium ${positiveMentions > negativeMentions * 2 ? 'text-green-600' : 'text-yellow-600'}`}>
              {positiveMentions > negativeMentions * 2 ? 'Very Positive' : 'Mixed Feedback'}
            </span>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((stars) => {
            const percentage = distribution[stars as keyof typeof distribution] || 0
            return (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium">{stars}</span>
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        stars === 5 ? 'bg-green-500' :
                        stars === 4 ? 'bg-green-400' :
                        stars === 3 ? 'bg-yellow-400' :
                        stars === 2 ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{percentage}%</span>
              </div>
            )
          })}
        </div>
        
        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Insight:</strong> 
            {distribution[5] >= 80 ? ' Exceptional satisfaction! Most guests are extremely happy.' :
             distribution[5] >= 60 ? ' Good satisfaction, but room for improvement to reach excellence.' :
             ' Focus on addressing guest concerns to improve 5-star ratings.'}
          </p>
        </div>
      </div>

      {/* Category Scores */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries({
            cleanliness: 'Cleanliness',
            accuracy: 'Accuracy',
            checkin: 'Check-in',
            communication: 'Communication',
            location: 'Location',
            value: 'Value'
          }).map(([key, label]) => {
            const score = categories[key as keyof typeof categories] || 0
            const isWeak = score > 0 && score < 4.7
            const isStrong = score >= 4.9
            
            return (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  {isWeak && <TrendingDown className="w-4 h-4 text-red-500" />}
                  {isStrong && <TrendingUp className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {score > 0 ? score.toFixed(1) : 'N/A'}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          isStrong ? 'bg-green-500' : isWeak ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                {isWeak && (
                  <p className="text-xs text-red-600 mt-2">Needs attention</p>
                )}
              </div>
            )
          })}
        </div>
        
        {weakCategories.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Action Required:</strong> Focus on improving {' '}
              {weakCategories.map(([cat]) => cat).join(', ')} to boost overall rating.
            </p>
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Recent Guest Feedback</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {recentReviews.length > 0 ? (
            recentReviews.slice(0, 10).map((review, index) => (
              <div key={index} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {review.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{review.author}</p>
                      <p className="text-xs text-gray-500">{review.date}</p>
                    </div>
                  </div>
                  {review.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{review.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{review.text}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No reviews available</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">💡 Review Optimization Tips</h3>
        <ul className="space-y-2">
          {totalCount < 30 && (
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span className="text-sm">Send follow-up messages encouraging guests to leave reviews</span>
            </li>
          )}
          {weakCategories.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span className="text-sm">
                Address {weakCategories[0][0]} issues - currently scoring {weakCategories[0][1]?.toFixed(1)}/5.0
              </span>
            </li>
          )}
          {distribution[5] < 60 && (
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span className="text-sm">Go above and beyond to convert 4-star experiences into 5-star ones</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span className="text-sm">Respond to all reviews, especially those mentioning issues</span>
          </li>
        </ul>
      </div>
    </div>
  )
}