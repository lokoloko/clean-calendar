'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, ArrowRight, Info, Loader2, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PropertyMapping {
  pdfName: string
  csvName?: string
  standardName: string
  revenue: number
  nightsBooked: number
  avgNightStay: number
  status: 'active' | 'inactive'
  mapped: boolean
  selected: boolean
  hasAccurateMetrics?: boolean
}

interface AIAnalysis {
  summary: {
    totalRevenue: number
    averageRevenue: number
    occupancyRate: number
    performanceScore: number
  }
  insights: Array<{
    type: 'success' | 'warning' | 'opportunity'
    message: string
  }>
  recommendations: string[]
}

// Predefined property mappings
const PROPERTY_MAPPINGS: Record<string, string> = {
  'Unit 1': 'Tranquil Apartment Steps from Old Town Monrovia',
  'Unit 2': 'Monrovia Charm - Exclusive Rental Unit',
  'Unit 3': 'Private Studio Apartment - Great Location',
  'Unit 4': 'Old Town Monrovia Bungalow',
  'Monrovia A': 'Minutes Wlk 2  OT Monrovia - 3 mile 2 City of Hope',
  'Monrovia B': 'Mountain View Getaway - 2 beds 1 bath Entire Unit',
  'Unit C': 'Private Bungalow near Old Town Monrovia',
  'Unit D': 'Adorable Affordable Studio Guest House',
  'Unit A': 'Work Away from Home Apartment',
  'Unit L1': 'Comfortable Apartment for Two',
  'Unit L2': 'Cozy Stopover: Rest, Refresh, Nourish',
  'Unit G': 'Serene Glendora Home w/ Pool & Prime Location',
  'L3 - Trailer': 'Modern RV • Quick Cozy Stay',
  'Glendora': 'Lovely 2 large bedrooms w/ 1.5 bath. Free parking.',
  'Azusa E - Sunrise Getaway': 'Sunrise Getaway -  A Studio Near APU',
  'Azusa F - Getaway': 'A Studio near City of Hope/APU - Azusa Getaway -',
  'Azusa G - Dream Getaway': 'A  Studio near City of Hope/APU Dream Getaway ',
  'Azusa H - HomeAway': 'HomeAway Lodge  -  A Studio near APU',
  'Unit H': 'Unit H'
}

export default function MappingPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<PropertyMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [dataSource, setDataSource] = useState<'pdf-only' | 'pdf-csv'>('pdf-only')

  useEffect(() => {
    // Get data from sessionStorage (passed from upload page)
    const uploadData = sessionStorage.getItem('uploadData')
    if (uploadData) {
      const parsed = JSON.parse(uploadData)
      
      // Set data source
      if (parsed.dataSource) {
        setDataSource(parsed.dataSource)
      }
      
      // Create property mappings from PDF data - preserve all data
      const mappings: PropertyMapping[] = parsed.properties.map((prop: any) => ({
        pdfName: prop.name,
        csvName: PROPERTY_MAPPINGS[prop.name] || '',
        standardName: prop.name,
        revenue: prop.netEarnings,
        nightsBooked: prop.nightsBooked || 0,
        avgNightStay: prop.avgNightStay || 0, // Will be 0 if not available from CSV
        status: prop.netEarnings > 0 ? 'active' : 'inactive',
        mapped: true, // Auto-mapped since we know the mappings
        selected: true, // Default to all selected
        hasAccurateMetrics: prop.hasAccurateMetrics || false
      }))
      
      setProperties(mappings)
    }
    setLoading(false)
  }, [])

  const togglePropertySelection = (index: number) => {
    const updated = [...properties]
    updated[index].selected = !updated[index].selected
    setProperties(updated)
  }

  const toggleAll = () => {
    const allSelected = properties.every(p => p.selected)
    setProperties(properties.map(p => ({ ...p, selected: !allSelected })))
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    
    // Get selected properties
    const selectedProperties = properties.filter(p => p.selected)
    
    // Store selected properties immediately for dashboard
    sessionStorage.setItem('propertyMappings', JSON.stringify(selectedProperties))
    
    // Save to PropertyStore for persistence
    try {
      const { PropertyStore } = await import('@/lib/storage/property-store')
      const uploadData = sessionStorage.getItem('uploadData')
      const parsed = uploadData ? JSON.parse(uploadData) : {}
      
      const dashboardData = {
        ...parsed,
        properties: selectedProperties,
        totalRevenue: selectedProperties.reduce((sum, p) => sum + p.revenue, 0),
        activeProperties: selectedProperties.filter(p => p.status === 'active').length,
        inactiveProperties: selectedProperties.filter(p => p.status === 'inactive').length,
        totalProperties: selectedProperties.length,
        totalNights: selectedProperties.reduce((sum, p) => sum + p.nightsBooked, 0),
        dataSource
      }
      
      const createdProperties = PropertyStore.createFromUpload(dashboardData)
      console.log(`Saved ${createdProperties.length} properties to PropertyStore`)
      
      // Sync back to sessionStorage for backwards compatibility
      const { DataMigration } = await import('@/lib/storage/migrations')
      DataMigration.syncWithSessionStorage(createdProperties)
    } catch (error) {
      console.error('Error saving to PropertyStore:', error)
    }
    
    try {
      // Call Gemini API for analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: selectedProperties,
          totalRevenue: selectedProperties.reduce((sum, p) => sum + p.revenue, 0),
          activeCount: selectedProperties.filter(p => p.status === 'active').length,
          inactiveCount: selectedProperties.filter(p => p.status === 'inactive').length
        })
      })
      
      if (response.ok) {
        const analysis = await response.json()
        sessionStorage.setItem('aiAnalysis', JSON.stringify(analysis))
      } else {
        // Fallback to mock analysis if API fails
        const mockAnalysis = generateMockAnalysis(selectedProperties)
        sessionStorage.setItem('aiAnalysis', JSON.stringify(mockAnalysis))
      }
    } catch (error) {
      console.error('Analysis error:', error)
      // Use mock analysis as fallback
      const mockAnalysis = generateMockAnalysis(selectedProperties)
      sessionStorage.setItem('aiAnalysis', JSON.stringify(mockAnalysis))
    }
    
    // Navigate directly to dashboard
    router.push('/dashboard')
  }

  const generateMockAnalysis = (selectedProps: PropertyMapping[]): AIAnalysis => {
    const totalRevenue = selectedProps.reduce((sum, p) => sum + p.revenue, 0)
    const activeProps = selectedProps.filter(p => p.status === 'active')
    const avgRevenue = selectedProps.length > 0 ? totalRevenue / selectedProps.length : 0
    const occupancyRate = activeProps.length / Math.max(selectedProps.length, 1) * 100
    
    return {
      summary: {
        totalRevenue,
        averageRevenue: avgRevenue,
        occupancyRate,
        performanceScore: Math.min(100, (totalRevenue / 20000) * 100)
      },
      insights: [
        ...(occupancyRate < 60 ? [{
          type: 'warning' as const,
          message: `Low occupancy rate (${occupancyRate.toFixed(0)}%) - Focus on activating inactive properties`
        }] : []),
        ...(avgRevenue > 2500 ? [{
          type: 'success' as const,
          message: `Strong average revenue of $${avgRevenue.toFixed(0)} per property`
        }] : []),
        ...(activeProps.length > 5 ? [{
          type: 'opportunity' as const,
          message: 'Consider dynamic pricing to optimize revenue across your portfolio'
        }] : [])
      ],
      recommendations: [
        'Review pricing strategy for underperforming properties',
        'Optimize listing descriptions and photos',
        'Consider seasonal adjustments for better occupancy',
        'Implement minimum stay requirements strategically'
      ]
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading property data...</p>
      </div>
    )
  }

  const selectedCount = properties.filter(p => p.selected).length
  const activeCount = properties.filter(p => p.status === 'active' && p.selected).length
  const inactiveCount = properties.filter(p => p.status === 'inactive' && p.selected).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Properties for Analysis</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium">How to use this page:</p>
                <ul className="text-sm text-blue-800 mt-1 space-y-1">
                  <li>• Check/uncheck properties you want to include in the analysis</li>
                  <li>• Properties with $0 earnings can be excluded if they're not active listings</li>
                  <li>• Click "Analyze Selected" to get AI-powered insights</li>
                  <li>• Review recommendations before proceeding to detailed dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality Badge */}
        {dataSource === 'pdf-csv' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Transaction Data Available</p>
                  <p className="text-sm text-green-700">
                    Property metrics are accurate - {properties.filter(p => p.hasAccurateMetrics).length} of {properties.length} properties have verified data
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {dataSource === 'pdf-only' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Estimated Metrics</p>
                  <p className="text-sm text-amber-700">
                    Property nights and average stays are estimated from revenue data
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/')}
                  title="Download from Airbnb: Account → Transaction History → Export CSV"
                >
                  Upload CSV for Accuracy
                </Button>
                <p className="text-xs text-amber-600 mt-1">
                  Airbnb → Transaction History → Export
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{selectedCount}/{properties.length}</div>
              <p className="text-sm text-gray-500">Selected Properties</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
              <p className="text-sm text-gray-500">Active Selected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{inactiveCount}</div>
              <p className="text-sm text-gray-500">Inactive Selected</p>
            </CardContent>
          </Card>
        </div>

        {/* Property Mappings */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Property Selection</CardTitle>
                <CardDescription>
                  Select properties to include in your portfolio analysis
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {properties.every(p => p.selected) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.map((property, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                    property.selected 
                      ? property.status === 'active' 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-orange-50 border-orange-300'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                  onClick={() => togglePropertySelection(index)}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={property.selected}
                      onChange={() => togglePropertySelection(index)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{property.pdfName}</p>
                        {property.hasAccurateMetrics ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            CSV Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Estimated
                          </span>
                        )}
                      </div>
                      {property.csvName && (
                        <p className="text-sm text-gray-500">CSV: {property.csvName}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {property.nightsBooked} nights • {property.avgNightStay > 0 ? `${property.avgNightStay.toFixed(1)} avg stay` : 'avg stay N/A'}
                        {!property.hasAccurateMetrics && ' (est.)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(property.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">{property.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            Back to Upload
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={selectedCount === 0 || analyzing}
            className="flex items-center gap-2"
            variant="default"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing & Loading Dashboard...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Analyze Selected ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}