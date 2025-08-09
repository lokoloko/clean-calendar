'use client'

import { useState, useEffect } from 'react'
import { Property, PropertyMetrics } from '@/lib/storage/property-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { calculatePeriodMetrics, getPeriodLabel, getPeriodDescription, type TimePeriod } from '@/lib/utils/period-metrics'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Star, 
  Home,
  Activity,
  Minus,
  Clock
} from 'lucide-react'

interface MetricsDashboardProps {
  property: Property
  selectedPeriod?: TimePeriod
  onPeriodChange?: (period: TimePeriod) => void
}

export default function MetricsDashboard({ 
  property, 
  selectedPeriod: externalSelectedPeriod,
  onPeriodChange 
}: MetricsDashboardProps) {
  // Use external period if provided, otherwise manage locally
  const [internalSelectedPeriod, setInternalSelectedPeriod] = useState<TimePeriod>('last12months')
  const selectedPeriod = externalSelectedPeriod || internalSelectedPeriod
  const setSelectedPeriod = onPeriodChange || setInternalSelectedPeriod
  
  const [periodMetrics, setPeriodMetrics] = useState<PropertyMetrics>(property.metrics)
  
  // Calculate metrics based on selected period
  useEffect(() => {
    const metrics = calculatePeriodMetrics(property, selectedPeriod)
    setPeriodMetrics(metrics)
  }, [selectedPeriod, property])
  
  const metrics = periodMetrics
  
  const getDataSourceBadge = (source?: string, confidence?: number) => {
    if (!source) {
      return <Badge variant="outline" className="text-xs bg-gray-50">No Data</Badge>
    }
    
    const sourceColors = {
      csv: 'bg-green-50 text-green-700 border-green-200',
      pdf: 'bg-blue-50 text-blue-700 border-blue-200',
      scraped: 'bg-purple-50 text-purple-700 border-purple-200',
      calculated: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }
    
    const sourceLabels = {
      csv: 'CSV Data',
      pdf: 'PDF Report',
      scraped: 'Live Data',
      calculated: 'Estimated'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${sourceColors[source as keyof typeof sourceColors] || 'bg-gray-50'}`}
      >
        {sourceLabels[source as keyof typeof sourceLabels] || source}
        {confidence && confidence < 70 ? ' ⚠️' : ''}
      </Badge>
    )
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
  
  const periods: TimePeriod[] = ['last12months', 'yearToDate', 'allTime']
  
  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Period</span>
          <span className="text-xs text-gray-500">({getPeriodDescription(selectedPeriod)})</span>
        </div>
        <div className="flex gap-2">
          {periods.map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {getPeriodLabel(period)}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
      {/* Revenue Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Revenue {selectedPeriod !== 'allTime' && <span className="text-xs">({getPeriodLabel(selectedPeriod)})</span>}
                </span>
                {getDataSourceBadge(metrics?.revenue?.source, metrics?.revenue?.confidence)}
              </div>
              <p className="text-2xl font-bold">
                {metrics?.revenue?.value ? formatCurrency(metrics.revenue.value) : '$0.00'}
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Occupancy</span>
                {getDataSourceBadge(metrics?.occupancy?.source, metrics?.occupancy?.confidence)}
              </div>
              <p className="text-2xl font-bold">
                {metrics?.occupancy?.value ? `${metrics.occupancy.value.toFixed(1)}%` : '0.0%'}
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Avg Rate</span>
                {getDataSourceBadge(metrics?.pricing?.source, metrics?.pricing?.confidence)}
              </div>
              <p className="text-2xl font-bold">
                {metrics?.pricing?.value ? `$${metrics.pricing.value.toFixed(0)}/night` : '$0/night'}
              </p>
              {property.dataSources?.scraped?.data?.price?.nightly && property.dataSources.scraped.data.price.nightly > 0 ? (
                <p className="text-xs text-gray-600">
                  Current: ${property.dataSources.scraped.data.price.nightly}
                </p>
              ) : null}
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{property.dataSources.scraped ? 'Rating' : 'Health'}</span>
                {property.dataSources.scraped ? 
                  getDataSourceBadge('scraped', 100) : 
                  getDataSourceBadge(metrics?.satisfaction?.source, metrics?.satisfaction?.confidence)
                }
              </div>
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
    </div>
  )
}