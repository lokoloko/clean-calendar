'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  DollarSign,
  Home,
  Moon,
  Activity
} from 'lucide-react'
import { calculateHealthScore, getHealthColor, getHealthBgColor, getHealthBorderColor } from '@/lib/analytics/health-score'
import { generateInsights, getInsightIcon, getInsightColor, type AIInsight } from '@/lib/ai/insights'

interface Property {
  name: string
  revenue: number
  nightsBooked: number
  avgNightStay: number
  status: 'active' | 'inactive'
  healthScore?: number
  healthStatus?: string
  recommendations?: string[]
}

interface DashboardData {
  totalRevenue: number
  activeProperties: number
  inactiveProperties: number
  totalNights: number
  properties: Property[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get data from sessionStorage
    const uploadData = sessionStorage.getItem('uploadData')
    if (uploadData) {
      const parsed = JSON.parse(uploadData)
      
      // Calculate health scores for each property
      const propertiesWithHealth = parsed.properties.map((prop: any) => {
        const health = calculateHealthScore({
          name: prop.name,
          revenue: prop.netEarnings,
          nightsBooked: prop.nightsBooked,
          avgNightStay: prop.avgNightStay
        })
        
        return {
          name: prop.name,
          revenue: prop.netEarnings,
          nightsBooked: prop.nightsBooked,
          avgNightStay: prop.avgNightStay,
          status: prop.netEarnings > 0 ? 'active' : 'inactive',
          healthScore: health.score,
          healthStatus: health.status,
          recommendations: health.recommendations
        }
      })
      
      const dashboardData = {
        totalRevenue: parsed.summary.totalRevenue,
        activeProperties: parsed.summary.activeProperties,
        inactiveProperties: parsed.summary.inactiveProperties,
        totalNights: parsed.summary.totalNights,
        properties: propertiesWithHealth
      }
      
      setData(dashboardData)
      
      // Generate AI insights
      generateInsights(dashboardData).then(setInsights)
    }
    setLoading(false)
  }, [])

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  // Sort properties by health score
  const sortedProperties = [...data.properties].sort((a, b) => 
    (b.healthScore || 0) - (a.healthScore || 0)
  )

  const criticalProperties = sortedProperties.filter(p => p.healthStatus === 'critical')
  const warningProperties = sortedProperties.filter(p => p.healthStatus === 'warning')
  const healthyProperties = sortedProperties.filter(p => p.healthStatus === 'healthy')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">Export Report</Button>
              <Button>Add More Data</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Insights & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.slice(0, 4).map((insight, index) => (
                <Card key={index} className={`border ${getInsightColor(insight.type)}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                        {insight.impact && (
                          <p className="text-sm font-semibold text-gray-900">{insight.impact}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${data.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Properties</p>
                  <p className="text-2xl font-bold text-green-600">
                    {data.activeProperties}
                  </p>
                  <p className="text-xs text-gray-400">of {data.properties.length} total</p>
                </div>
                <Home className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Nights</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalNights}</p>
                  <p className="text-xs text-gray-400">This month</p>
                </div>
                <Moon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Health Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(
                      data.properties.reduce((sum, p) => sum + (p.healthScore || 0), 0) / 
                      data.properties.length
                    )}
                  </p>
                  <p className="text-xs text-gray-400">Portfolio health</p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Status Overview */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-900">Critical</p>
                  <p className="text-3xl font-bold text-red-600">{criticalProperties.length}</p>
                  <p className="text-xs text-red-700">Properties need urgent attention</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Warning</p>
                  <p className="text-3xl font-bold text-yellow-600">{warningProperties.length}</p>
                  <p className="text-xs text-yellow-700">Properties need optimization</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-900">Healthy</p>
                  <p className="text-3xl font-bold text-green-600">{healthyProperties.length}</p>
                  <p className="text-xs text-green-700">Properties performing well</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties Table */}
        <Card>
          <CardHeader>
            <CardTitle>Property Performance</CardTitle>
            <CardDescription>
              All {data.properties.length} properties sorted by health score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Nights</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Stay</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Health</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Recommendations</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProperties.map((property, index) => (
                    <tr 
                      key={index} 
                      className={`border-b hover:bg-gray-50 ${
                        property.status === 'inactive' ? 'bg-gray-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">{property.name}</p>
                          <p className="text-xs text-gray-500">{property.status}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={property.revenue > 0 ? 'font-semibold' : 'text-gray-400'}>
                          ${property.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {property.nightsBooked}
                      </td>
                      <td className="text-right py-3 px-4">
                        {property.avgNightStay.toFixed(1)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className={`inline-flex items-center justify-center w-16 h-8 rounded-full ${getHealthBgColor(property.healthScore || 0)} ${getHealthBorderColor(property.healthScore || 0)} border`}>
                          <span className={`font-bold ${getHealthColor(property.healthScore || 0)}`}>
                            {property.healthScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {property.recommendations && property.recommendations.length > 0 ? (
                          <ul className="text-sm text-gray-600">
                            {property.recommendations.slice(0, 2).map((rec, i) => (
                              <li key={i} className="truncate max-w-xs" title={rec}>
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-green-600">✓ Performing well</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Action Items for Inactive Properties */}
        {data.inactiveProperties > 0 && (
          <Card className="mt-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900">
                ⚠️ Attention Required: {data.inactiveProperties} Inactive Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                The following properties generated no revenue this month and require immediate attention:
              </p>
              <div className="grid grid-cols-2 gap-4">
                {sortedProperties
                  .filter(p => p.status === 'inactive')
                  .map((property, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold">{property.name}</span>
                      <span className="text-sm text-gray-500">
                        ({property.nightsBooked} nights booked but $0 revenue)
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}