'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { type Property } from '@/lib/storage/property-store'
import { DataSync } from '@/lib/utils/data-sync'
import { formatCurrency } from '@/lib/utils'
import PropertyHeader from './components/PropertyHeader'
import MetricsDashboard from './components/MetricsDashboard'
import GoStudioMInsightsTabs from './components/GoStudioMInsightsTabs'
import DataSourceCards from './components/DataSourceCards'
import PerformanceCharts from './components/PerformanceCharts'
import ActionSidebar from './components/ActionSidebar'
import { type TimePeriod } from '@/lib/utils/period-metrics'
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  Settings,
  TrendingUp,
  Calendar,
  DollarSign,
  Star,
  Home,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Shield,
  Wifi,
  Car,
  Coffee
} from 'lucide-react'

export interface PropertyInsights {
  actionable: ActionItem[]
  analysis: AnalysisResult[]
  predictions: Prediction[]
  coaching: CoachingTip[]
  lastGenerated: Date
}

export interface ActionItem {
  id: string
  priority: 'critical' | 'important' | 'opportunity'
  category: string
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  automatable: boolean
}

export interface AnalysisResult {
  id: string
  type: 'revenue' | 'occupancy' | 'pricing' | 'satisfaction'
  title: string
  findings: string[]
  trend: 'up' | 'down' | 'stable'
  confidence: number
}

export interface Prediction {
  id: string
  period: string
  metric: string
  value: number
  confidence: number
  factors: string[]
}

export interface CoachingTip {
  id: string
  category: string
  tip: string
  context: string
  resources?: string[]
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [insights, setInsights] = useState<PropertyInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('last12months')
  
  useEffect(() => {
    loadProperty()
  }, [propertyId])
  
  const loadProperty = async () => {
    try {
      setLoading(true)
      console.log('Loading property with ID:', propertyId)
      
      // Try to fetch property from API first
      const response = await fetch(`/api/properties/${propertyId}`)
      const data = await response.json()
      
      if (response.ok && data.success && data.property) {
        const prop = data.property
        
        // Convert date strings to Date objects
        if (prop.updatedAt) prop.updatedAt = new Date(prop.updatedAt)
        if (prop.createdAt) prop.createdAt = new Date(prop.createdAt)
        if (prop.lastSyncedAt) prop.lastSyncedAt = new Date(prop.lastSyncedAt)
        
        // Convert dates in dataSources
        if (prop.dataSources?.pdf?.uploadedAt) {
          prop.dataSources.pdf.uploadedAt = new Date(prop.dataSources.pdf.uploadedAt)
        }
        if (prop.dataSources?.csv?.uploadedAt) {
          prop.dataSources.csv.uploadedAt = new Date(prop.dataSources.csv.uploadedAt)
        }
        if (prop.dataSources?.csv?.dateRange) {
          if (prop.dataSources.csv.dateRange.start) {
            prop.dataSources.csv.dateRange.start = new Date(prop.dataSources.csv.dateRange.start)
          }
          if (prop.dataSources.csv.dateRange.end) {
            prop.dataSources.csv.dateRange.end = new Date(prop.dataSources.csv.dateRange.end)
          }
        }
        if (prop.dataSources?.scraped?.scrapedAt) {
          prop.dataSources.scraped.scrapedAt = new Date(prop.dataSources.scraped.scrapedAt)
        }
        
        // Convert dates in metrics
        if (prop.metrics) {
          ['revenue', 'occupancy', 'pricing', 'satisfaction'].forEach(metric => {
            if (prop.metrics[metric]?.lastUpdated) {
              prop.metrics[metric].lastUpdated = new Date(prop.metrics[metric].lastUpdated)
            }
          })
        }
        
        console.log('Loaded property:', {
          id: prop.id,
          name: prop.name,
          hasMetrics: !!prop.metrics,
          revenue: prop.metrics?.revenue?.value,
          occupancy: prop.metrics?.occupancy?.value,
          pricing: prop.metrics?.pricing?.value,
          hasCSV: !!prop.dataSources?.csv,
          csvMetricsCount: prop.dataSources?.csv?.propertyMetrics?.length || 0
        })
        
        setProperty(prop)
        
        // Check if we need to generate insights
        if (!insights || shouldRegenerateInsights(prop)) {
          generateInsights(prop)
        }
      } else {
        // Try to load from individual property in sessionStorage first
        const individualProp = sessionStorage.getItem(`property-${propertyId}`)
        if (individualProp) {
          const prop = JSON.parse(individualProp)
          console.log('Loaded individual property from session storage')
          setProperty(prop)
          generateInsights(prop)
          setLoading(false)
          return
        }
        
        // Try to load from sessionStorage for unauthenticated users
        const sessionData = sessionStorage.getItem('processedData')
        if (sessionData) {
          const data = JSON.parse(sessionData)
          const prop = data.properties?.find((p: any) => p.id === propertyId)
          
          if (prop) {
            console.log('Loaded property from session storage')
            // Transform to Property format
            const transformedProp: Property = {
              id: prop.id || propertyId,
              name: prop.name || prop.standardName || prop.pdfName || 'Unnamed Property',
              standardName: prop.standardName || prop.name || prop.pdfName || 'Unnamed Property',
              airbnbUrl: prop.airbnbUrl || '',
              metrics: {
                revenue: { 
                  value: prop.netEarnings || prop.revenue || 0,
                  source: 'csv' as const,
                  confidence: 100,
                  lastUpdated: new Date()
                },
                occupancy: { 
                  value: (() => {
                    // Calculate occupancy based on actual date range if available
                    if (prop.nightsBooked && data.csv?.dateRange) {
                      const start = new Date(data.csv.dateRange.start)
                      const end = new Date(data.csv.dateRange.end)
                      const daySpan = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 365
                      return (prop.nightsBooked / daySpan) * 100
                    }
                    return prop.nightsBooked ? (prop.nightsBooked / 365) * 100 : 0
                  })(),
                  source: 'csv' as const,
                  confidence: 100,
                  lastUpdated: new Date()
                },
                pricing: { 
                  value: prop.avgNightlyRate || (prop.revenue && prop.nightsBooked ? prop.revenue / prop.nightsBooked : 0),
                  source: 'csv' as const,
                  confidence: 100,
                  lastUpdated: new Date()
                },
                satisfaction: {
                  value: 0,
                  source: 'calculated' as const,
                  confidence: 0,
                  lastUpdated: new Date()
                },
                health: 80
              },
              dataSources: {
                pdf: !!data.pdf,
                csv: data.csv ? {
                  dateRange: data.csv.dateRange,
                  propertyMetrics: [{
                    name: prop.name || prop.standardName || prop.pdfName || 'Unnamed Property',
                    totalRevenue: prop.netEarnings || prop.revenue || 0,
                    totalNights: prop.nightsBooked || 0,
                    avgStayLength: prop.avgNightStay || 2.5,
                    bookingCount: prop.bookingCount || 0,
                    avgNightlyRate: prop.avgNightlyRate || 0
                  }]
                } : null,
                scraped: false
              },
              dataCompleteness: data.csv ? 100 : (data.pdf ? 50 : 0),
              updatedAt: new Date(),
              createdAt: new Date()
            }
            
            setProperty(transformedProp)
            generateInsights(transformedProp)
            setLoading(false)
            return
          }
        }
        
        // Property not found anywhere, redirect to properties list
        console.log('Property not found, redirecting to properties list')
        router.push('/properties')
      }
    } catch (error) {
      console.error('Error loading property:', error)
      router.push('/properties')
    }
    setLoading(false)
  }
  
  const shouldRegenerateInsights = (prop: Property): boolean => {
    if (!insights) return true
    
    // Regenerate if data has been updated since last insights
    const lastInsightTime = insights.lastGenerated.getTime()
    const lastUpdateTime = prop.updatedAt.getTime()
    
    return lastUpdateTime > lastInsightTime
  }
  
  const generateInsights = async (prop: Property) => {
    setGeneratingInsights(true)
    
    try {
      // Call Gemini API for insights
      const response = await fetch('/api/property/' + prop.id + '/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: prop,
          dataSources: prop.dataSources,
          metrics: prop.metrics
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setInsights({
          ...data,
          lastGenerated: new Date()
        })
      } else {
        // Use mock insights as fallback
        setInsights(generateRealInsights(prop))
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      setInsights(generateMockInsights(prop))
    }
    
    setGeneratingInsights(false)
  }
  
  const generateRealInsights = (prop: Property): PropertyInsights => {
    // Extract real data from CSV if available
    const csvData = prop.dataSources?.csv?.propertyMetrics?.[0]
    const revenue = (typeof prop.metrics?.revenue?.value === 'number' ? prop.metrics.revenue.value : prop.metrics?.revenue?.value?.value) || csvData?.totalRevenue || 0
    const totalNights = csvData?.totalNights || prop.dataSources?.csv?.propertyMetrics?.[0]?.totalNights || 0
    const avgStayLength = csvData?.avgStayLength || 2.5
    const bookingCount = csvData?.bookingCount || 0
    const avgNightlyRate = csvData?.avgNightlyRate || (revenue && totalNights ? revenue / totalNights : 0)
    
    // Calculate real metrics with actual date range
    let occupancyRate = 0
    if (totalNights > 0) {
      // Try to use actual date range from CSV data
      if (prop.dataSources?.csv?.dateRange) {
        const start = new Date(prop.dataSources.csv.dateRange.start)
        const end = new Date(prop.dataSources.csv.dateRange.end)
        const daySpan = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        occupancyRate = daySpan > 0 ? (totalNights / daySpan) * 100 : 0
      } else {
        // Fallback to 365 days if no date range available
        occupancyRate = (totalNights / 365) * 100
      }
    }
    const monthlyRevenue = revenue / 12
    const bookingFrequency = bookingCount / 12 // bookings per month
    const hasMetrics = revenue > 0 || totalNights > 0
    
    return {
      actionable: [
        {
          id: '1',
          priority: occupancyRate < 50 ? 'critical' : revenue < 30000 && revenue > 0 ? 'important' : 'opportunity',
          category: occupancyRate < 50 ? 'Occupancy' : 'Pricing',
          title: occupancyRate < 50 
            ? `Improve Occupancy (Current: ${occupancyRate.toFixed(1)}%)`
            : hasMetrics 
              ? `Optimize Pricing (Current: $${avgNightlyRate.toFixed(0)}/night)` 
              : 'Add Transaction Data',
          description: occupancyRate < 50
            ? `Your occupancy rate of ${occupancyRate.toFixed(1)}% is below market average. Review pricing, listing quality, and availability.`
            : hasMetrics 
              ? `With ${totalNights} nights booked and ${avgStayLength.toFixed(1)} avg stay, dynamic pricing could increase revenue`
              : 'Upload CSV transaction data to see revenue insights',
          impact: occupancyRate < 50 
            ? `+${Math.round((70 - occupancyRate) * 365 / 100)} nights/year`
            : hasMetrics 
              ? `+$${(revenue * 0.15).toFixed(0)}/year` 
              : 'Enable analytics',
          effort: occupancyRate < 50 ? 'medium' : 'low',
          automatable: hasMetrics && occupancyRate >= 50
        },
        {
          id: '2',
          priority: !prop.airbnbUrl ? 'critical' : 'opportunity',
          category: 'Data',
          title: !prop.airbnbUrl ? 'Add Airbnb URL' : 'Update Photos',
          description: !prop.airbnbUrl 
            ? 'Add your Airbnb URL to enable live data sync and competitor analysis'
            : 'Properties with 20+ photos book 15% more often',
          impact: !prop.airbnbUrl ? 'Enable full features' : '+10% bookings',
          effort: 'low',
          automatable: false
        },
        {
          id: '3',
          priority: occupancyRate < 60 ? 'important' : 'opportunity',
          category: 'Marketing',
          title: 'Enable Instant Book',
          description: 'Increase visibility and bookings by 20%',
          impact: '+20% visibility',
          effort: 'low',
          automatable: true
        }
      ],
      analysis: [
        {
          id: '1',
          type: 'revenue',
          title: 'Revenue Performance',
          findings: hasMetrics ? [
            `Annual revenue: ${formatCurrency(revenue)} from ${totalNights} nights`,
            `Average rate: $${avgNightlyRate.toFixed(0)}/night • ${bookingCount} total bookings`,
            revenue > 40000 ? '✅ Above market average for similar properties' : 
            revenue > 20000 ? '⚠️ Room for improvement - consider pricing optimization' :
            '❌ Significantly below market - review pricing and marketing'
          ] : [
            'No revenue data available',
            'Upload CSV transaction file to see revenue analysis'
          ],
          trend: revenue > 40000 ? 'up' : revenue > 0 ? 'stable' : 'down',
          confidence: prop.metrics?.revenue?.confidence || 0
        },
        {
          id: '2',
          type: 'occupancy',
          title: 'Occupancy Analysis',
          findings: hasMetrics ? [
            `Occupancy rate: ${occupancyRate.toFixed(1)}% (${totalNights} nights/365)`,
            `Average stay: ${avgStayLength.toFixed(1)} nights • ${bookingFrequency.toFixed(1)} bookings/month`,
            occupancyRate >= 75 ? '✅ Strong occupancy - maintaining good demand' :
            occupancyRate >= 60 ? '⚠️ Below market - consider pricing adjustments' :
            '❌ Low occupancy - review listing and pricing strategy'
          ] : [
            'No occupancy data available',
            'Upload CSV transaction file to see occupancy analysis'
          ],
          trend: occupancyRate > 70 ? 'up' : occupancyRate > 0 ? 'stable' : 'down',
          confidence: prop.metrics?.occupancy?.confidence || 0
        }
      ],
      predictions: [
        {
          id: '1',
          period: 'Next 30 days',
          metric: 'Revenue',
          value: revenue / 12,
          confidence: 75,
          factors: ['Seasonal trends', 'Current bookings', 'Market demand']
        },
        {
          id: '2',
          period: 'Next Quarter',
          metric: 'Occupancy',
          value: occupancyRate + 5,
          confidence: 70,
          factors: ['Historical patterns', 'Local events', 'Competition']
        }
      ],
      coaching: [
        {
          id: '1',
          category: 'Revenue Optimization',
          tip: 'Focus on weekend pricing',
          context: 'Your weekend rates are below market. A 20% increase could add $3,600 annually.',
          resources: ['Pricing best practices', 'Dynamic pricing tools']
        },
        {
          id: '2',
          category: 'Guest Experience',
          tip: 'Improve response time',
          context: 'Faster responses lead to more bookings and better reviews.',
          resources: ['Auto-messaging templates', 'Response time tips']
        }
      ],
      lastGenerated: new Date()
    }
  }
  
  const handleSync = async () => {
    if (!property) return
    
    setSyncing(true)
    
    try {
      // Call the API directly instead of using DataSync (which tries to use localStorage on server)
      const response = await fetch('/api/scrape/airbnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: property.airbnbUrl,
          propertyId: property.id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Scraping failed: ${response.statusText}`)
      }
      
      const scrapeResult = await response.json()
      
      if (scrapeResult.success && scrapeResult.data) {
        // Update property with scraped data via API
        const updateResponse = await fetch(`/api/properties/${property.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataSources: {
              ...property.dataSources,
              scraped: {
                data: scrapeResult.data,
                scrapedAt: new Date().toISOString(),
                source: 'browserless'
              }
            },
            lastSyncedAt: new Date().toISOString()
          })
        })
        
        if (updateResponse.ok) {
          console.log('Sync successful:', scrapeResult)
          await loadProperty() // Reload to get updated data
        } else {
          throw new Error('Failed to update property with scraped data')
        }
      } else {
        throw new Error(scrapeResult.error || 'Unknown scraping error')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert(`Sync failed: ${error}`)
    }
    
    setSyncing(false)
  }
  
  const handleExport = () => {
    if (!property) return
    
    const exportData = {
      property,
      insights,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${property.standardName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }
  
  const handleAddUrl = async () => {
    if (!property) return
    
    const url = prompt('Enter Airbnb URL:', property.airbnbUrl || '')
    if (url && url !== property.airbnbUrl) {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airbnbUrl: url,
          airbnbListingId: url.match(/rooms\/(\d+)/)?.[1] || undefined
        })
      })
      
      if (response.ok) {
        await loadProperty()
      }
    }
  }
  
  const handleUploadData = (type: 'pdf' | 'csv') => {
    // TODO: Implement file upload modal
    console.log(`Upload ${type} for property:`, property?.id)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading property details...</p>
        </div>
      </div>
    )
  }
  
  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
          <p className="text-gray-600 mb-4">The property you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/properties')}>
            Back to Properties
          </Button>
        </div>
      </div>
    )
  }
  
  const syncStatus = DataSync.getSyncStatus(property)
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/properties')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="border-l pl-4">
                <PropertyHeader
                  property={property}
                  onEditName={async (newName) => {
                    // Update both name and standardName via API
                    const response = await fetch(`/api/properties/${property.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newName,
                        standardName: newName
                      })
                    })
                    
                    if (response.ok) {
                      await loadProperty()
                    }
                  }}
                  onEditUrl={handleAddUrl}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={syncStatus.needsSync ? 'destructive' : 'secondary'}>
                {syncStatus.message}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={!syncStatus.canSync || syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Dashboard */}
        <MetricsDashboard 
          property={property} 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        
        {/* Main Content Area */}
        <div className="grid grid-cols-12 gap-6 mt-8">
          {/* Left Content - 9 columns */}
          <div className="col-span-9 space-y-6">
            {/* GoStudioM Insights */}
            <GoStudioMInsightsTabs
              insights={insights}
              property={property}
              selectedPeriod={selectedPeriod}
              onRegenerateInsights={() => generateInsights(property)}
              isGenerating={generatingInsights}
            />
            
            {/* Data Sources */}
            <DataSourceCards
              property={property}
              selectedPeriod={selectedPeriod}
              onUploadPdf={() => handleUploadData('pdf')}
              onUploadCsv={() => handleUploadData('csv')}
              onAddUrl={handleAddUrl}
              onSync={handleSync}
            />
            
            {/* Performance Charts */}
            <PerformanceCharts property={property} selectedPeriod={selectedPeriod} />
          </div>
          
          {/* Right Sidebar - 3 columns */}
          <div className="col-span-3">
            <ActionSidebar
              property={property}
              onExport={handleExport}
              onShare={() => console.log('Share')}
              onCompare={() => router.push(`/comparison?property=${property.id}`)}
              onScheduleSync={() => console.log('Schedule sync')}
              onEmailReport={() => console.log('Email report')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}