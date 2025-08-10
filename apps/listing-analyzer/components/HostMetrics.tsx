'use client'

import { Shield, Clock, MessageCircle, Award, Calendar, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'

interface HostMetricsProps {
  host?: {
    name: string
    isSuperhost: boolean
    responseRate?: number
    responseTime?: string
    hostingSince?: string
    verifiedIdentity?: boolean
    languages?: string[]
    about?: string
  }
  cancellationPolicy?: {
    type: string
    description?: string
  }
  houseRules?: {
    checkIn?: {
      time?: string
      type?: string
    }
    checkOut?: {
      time?: string
    }
    during?: {
      smoking?: boolean
      pets?: boolean
      parties?: boolean
      quietHours?: string
    }
  }
  safetyFeatures?: string[]
}

export default function HostMetrics({
  host,
  cancellationPolicy,
  houseRules,
  safetyFeatures = []
}: HostMetricsProps) {
  // Calculate host score
  const hasGoodResponseRate = (host?.responseRate || 0) >= 90
  const hasQuickResponse = host?.responseTime?.includes('hour') || host?.responseTime?.includes('quickly')
  const isSuperhost = host?.isSuperhost || false
  const isVerified = host?.verifiedIdentity || false
  
  // Policy analysis
  const cancellationType = cancellationPolicy?.type || 'Standard'
  const isFlexible = cancellationType.toLowerCase().includes('flexible')
  const isStrict = cancellationType.toLowerCase().includes('strict')
  
  // House rules analysis
  const hasClearCheckIn = !!(houseRules?.checkIn?.time)
  const hasClearCheckOut = !!(houseRules?.checkOut?.time)
  const allowsPets = houseRules?.during?.pets !== false
  const allowsParties = houseRules?.during?.parties !== false
  const hasQuietHours = !!(houseRules?.during?.quietHours)
  
  // Safety score
  const safetyScore = Math.min((safetyFeatures.length / 6) * 100, 100)

  return (
    <div className="space-y-8">
      {/* Host Profile */}
      {host && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Host Profile</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600">
                  {host.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{host.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {isSuperhost && (
                      <span className="flex items-center gap-1 text-sm text-red-500">
                        <Award className="w-4 h-4" />
                        Superhost
                      </span>
                    )}
                    {isVerified && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {host.hostingSince && (
                <div className="text-sm text-gray-600 mb-2">
                  Hosting since {host.hostingSince}
                </div>
              )}
              
              {host.languages && host.languages.length > 0 && (
                <div className="text-sm text-gray-600">
                  Languages: {host.languages.join(', ')}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Response Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{host.responseRate || 'N/A'}%</span>
                  {hasGoodResponseRate ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Response Time</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{host.responseTime || 'Unknown'}</span>
                  {hasQuickResponse && <Clock className="w-4 h-4 text-green-500" />}
                </div>
              </div>
            </div>
          </div>
          
          {!isSuperhost && (
            <div className="mt-6 p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Tip:</strong> Qualify for Superhost status by maintaining 4.8+ rating, 90%+ response rate, and 10+ stays per year.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Policy */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Cancellation Policy</h3>
        
        <div className="p-4 border-2 rounded-lg mb-4" 
          style={{ 
            borderColor: isFlexible ? '#10b981' : isStrict ? '#f59e0b' : '#3b82f6'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl font-bold">{cancellationType}</span>
            {isFlexible && <CheckCircle className="w-5 h-5 text-green-500" />}
            {isStrict && <AlertTriangle className="w-5 h-5 text-orange-500" />}
          </div>
          {cancellationPolicy?.description && (
            <p className="text-sm text-gray-600">{cancellationPolicy.description}</p>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-1">Guest-Friendly</h4>
            <p className="text-sm text-green-700">
              {isFlexible ? 'Your flexible policy attracts more bookings' : 
               isStrict ? 'Consider more flexible terms for more bookings' :
               'Moderate policy balances guest needs and host protection'}
            </p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">Revenue Impact</h4>
            <p className="text-sm text-blue-700">
              {isFlexible ? 'May see 10-15% more bookings' :
               isStrict ? 'May reduce bookings by 5-10%' :
               'Standard for most properties'}
            </p>
          </div>
        </div>
      </div>

      {/* House Rules */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">House Rules Analysis</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Check-in Time</span>
              {hasClearCheckIn ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {houseRules?.checkIn?.time || 'Not specified'}
            </p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Check-out Time</span>
              {hasClearCheckOut ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {houseRules?.checkOut?.time || 'Not specified'}
            </p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quiet Hours</span>
              {hasQuietHours ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Info className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {houseRules?.during?.quietHours || 'Not specified'}
            </p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg ${allowsPets ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2">
              {allowsPets ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {allowsPets ? 'Pets Allowed' : 'No Pets'}
              </span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${!houseRules?.during?.smoking ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2">
              {!houseRules?.during?.smoking ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {houseRules?.during?.smoking ? 'Smoking Allowed' : 'No Smoking'}
              </span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${!houseRules?.during?.parties ? 'bg-green-50' : 'bg-orange-50'}`}>
            <div className="flex items-center gap-2">
              {!houseRules?.during?.parties ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              )}
              <span className="text-sm font-medium">
                {houseRules?.during?.parties ? 'Parties Allowed' : 'No Parties'}
              </span>
            </div>
          </div>
        </div>
        
        {(!hasClearCheckIn || !hasClearCheckOut) && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-900">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Clear check-in/out times reduce guest confusion and improve reviews.
            </p>
          </div>
        )}
      </div>

      {/* Safety Features */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Safety & Security</h3>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Safety Score</span>
            <span className="text-lg font-bold">{safetyScore.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                safetyScore >= 80 ? 'bg-green-500' :
                safetyScore >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${safetyScore}%` }}
            />
          </div>
        </div>
        
        {safetyFeatures.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {safetyFeatures.map((feature, index) => (
              <span key={index} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {feature}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm mb-4">No safety features listed</p>
        )}
        
        {safetyScore < 80 && (
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-900 mb-2">Essential Safety Items to Add:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              {!safetyFeatures.includes('Smoke alarm') && <li>• Smoke alarm</li>}
              {!safetyFeatures.includes('Carbon monoxide alarm') && <li>• Carbon monoxide alarm</li>}
              {!safetyFeatures.includes('Fire extinguisher') && <li>• Fire extinguisher</li>}
              {!safetyFeatures.includes('First aid kit') && <li>• First aid kit</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Overall Recommendations */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Host Performance Optimization</h3>
        <div className="space-y-3">
          {!isSuperhost && (
            <div className="p-3 bg-white rounded-lg border-l-4 border-purple-500">
              <h4 className="font-medium mb-1">Work Towards Superhost Status</h4>
              <p className="text-sm text-gray-700">
                Superhosts earn 22% more on average. Focus on quick responses and maintaining high ratings.
              </p>
            </div>
          )}
          
          {isStrict && (
            <div className="p-3 bg-white rounded-lg border-l-4 border-blue-500">
              <h4 className="font-medium mb-1">Consider More Flexible Cancellation</h4>
              <p className="text-sm text-gray-700">
                Properties with flexible policies see 15% more bookings on average.
              </p>
            </div>
          )}
          
          {!allowsPets && (
            <div className="p-3 bg-white rounded-lg border-l-4 border-green-500">
              <h4 className="font-medium mb-1">Consider Allowing Pets</h4>
              <p className="text-sm text-gray-700">
                Pet-friendly listings can charge 20-30% premium and access a larger market.
              </p>
            </div>
          )}
          
          {safetyScore < 80 && (
            <div className="p-3 bg-white rounded-lg border-l-4 border-red-500">
              <h4 className="font-medium mb-1">Enhance Safety Features</h4>
              <p className="text-sm text-gray-700">
                Complete safety features build trust and are required by many jurisdictions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}