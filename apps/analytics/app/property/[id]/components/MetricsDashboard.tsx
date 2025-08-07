'use client'

import { Property } from '@/lib/storage/property-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Star, 
  Home,
  Activity,
  Minus
} from 'lucide-react'

interface MetricsDashboardProps {
  property: Property
}

export default function MetricsDashboard({ property }: MetricsDashboardProps) {
  const metrics = property.metrics
  
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return <Badge variant="outline" className="text-xs">Verified</Badge>
    } else if (confidence >= 70) {
      return <Badge variant="outline" className="text-xs">Estimated</Badge>
    } else {
      return <Badge variant="outline" className="text-xs">Low Confidence</Badge>
    }
  }
  
  const getTrendIcon = (value: number, baseline: number) => {
    if (value > baseline) {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    } else if (value < baseline) {
      return <TrendingDown className="w-4 h-4 text-red-600" />
    } else {
      return <Minus className="w-4 h-4 text-gray-400" />
    }
  }
  
  const calculateYoYChange = (current: number): number => {
    // Mock calculation - in real app, would compare with previous year
    return Math.random() * 30 - 15 // Random between -15% and +15%
  }
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Revenue Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                Revenue
                {metrics?.revenue && getConfidenceBadge(metrics.revenue.confidence)}
              </p>
              <p className="text-2xl font-bold">
                {metrics?.revenue ? formatCurrency(metrics.revenue.value) : 'N/A'}
              </p>
              {metrics?.revenue && (
                <div className="flex items-center gap-1">
                  {getTrendIcon(metrics.revenue.value, 40000)}
                  <span className={`text-xs ${metrics.revenue.value > 40000 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateYoYChange(metrics.revenue.value).toFixed(1)}% YoY
                  </span>
                </div>
              )}
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Occupancy Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                Occupancy
                {metrics?.occupancy && getConfidenceBadge(metrics.occupancy.confidence)}
              </p>
              <p className="text-2xl font-bold">
                {metrics?.occupancy ? `${metrics.occupancy.value.toFixed(1)}%` : 'N/A'}
              </p>
              {property.dataSources.pdf && (
                <p className="text-xs text-gray-600">
                  {property.dataSources.pdf.data.totalNightsBooked || 0} nights
                </p>
              )}
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Average Rate Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                Avg Rate
                {metrics?.pricing && getConfidenceBadge(metrics.pricing.confidence)}
              </p>
              <p className="text-2xl font-bold">
                {metrics?.pricing ? `$${metrics.pricing.value.toFixed(0)}/night` : 'N/A'}
              </p>
              {property.dataSources.scraped?.data.price?.nightly && (
                <p className="text-xs text-gray-600">
                  Current: ${property.dataSources.scraped.data.price.nightly}
                </p>
              )}
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Home className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rating/Health Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                {property.dataSources.scraped ? 'Rating' : 'Health'}
                {metrics?.satisfaction && getConfidenceBadge(metrics.satisfaction.confidence)}
              </p>
              {property.dataSources.scraped?.data.reviews?.overall ? (
                <>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    {property.dataSources.scraped.data.reviews.overall}
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </p>
                  <p className="text-xs text-gray-600">
                    {property.dataSources.scraped.data.reviews.count} reviews
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {metrics?.health || 0}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        (metrics?.health || 0) >= 80 ? 'bg-green-600' :
                        (metrics?.health || 0) >= 60 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${metrics?.health || 0}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              {property.dataSources.scraped ? (
                <Star className="w-5 h-5 text-yellow-600" />
              ) : (
                <Activity className="w-5 h-5 text-yellow-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}