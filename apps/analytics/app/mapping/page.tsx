'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, AlertCircle, ArrowRight, Info, Loader2, TrendingUp, AlertTriangle, DollarSign, Link as LinkIcon, Plus, ExternalLink, HelpCircle } from 'lucide-react'
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
  airbnbUrl?: string
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
      const mappings: PropertyMapping[] = parsed.properties.map((prop: any, index: number) => ({
        pdfName: prop.name,
        csvName: PROPERTY_MAPPINGS[prop.name] || '',
        standardName: prop.name,
        revenue: prop.netEarnings,
        nightsBooked: prop.nightsBooked || 0,
        avgNightStay: prop.avgNightStay || 0, // Will be 0 if not available from CSV
        status: prop.netEarnings > 0 ? 'active' : 'inactive',
        mapped: true, // Auto-mapped since we know the mappings
        selected: true, // Default to all selected
        hasAccurateMetrics: prop.hasAccurateMetrics || false,
        // Pre-populate URLs if provided from upload page
        airbnbUrl: parsed.propertyUrls?.[index] || ''
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
  
  const updatePropertyUrl = (index: number, url: string) => {
    const updated = [...properties]
    // Basic URL validation
    if (url && !url.includes('airbnb.com/rooms/')) {
      console.warn('Invalid Airbnb URL format')
    }
    updated[index].airbnbUrl = url
    setProperties(updated)
  }
  
  const handleBulkUrlPaste = () => {
    const urls = prompt('Paste Airbnb URLs (one per line):')
    if (urls) {
      const urlArray = urls.split('\n').filter(url => url.trim())
      const updated = [...properties]
      
      // Try to match URLs to properties
      urlArray.forEach((url, i) => {
        if (i < updated.length && url.includes('airbnb.com/rooms/')) {
          updated[i].airbnbUrl = url.trim()
        }
      })
      
      setProperties(updated)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    
    // Get selected properties
    const selectedProperties = properties.filter(p => p.selected)
    
    // Get upload data from sessionStorage
    const uploadData = sessionStorage.getItem('uploadData')
    const parsed = uploadData ? JSON.parse(uploadData) : {}
    
    // Save to PropertyStore via API
    try {
      // Prepare data for API
      const dashboardData = {
        ...parsed,
        properties: selectedProperties,
        totalRevenue: selectedProperties.reduce((sum, p) => sum + p.revenue, 0),
        activeProperties: selectedProperties.filter(p => p.status === 'active').length,
        inactiveProperties: selectedProperties.filter(p => p.status === 'inactive').length,
        totalProperties: selectedProperties.length,
        totalNights: selectedProperties.reduce((sum, p) => sum + p.nightsBooked, 0),
        dataSource,
        csv: parsed.csv || null,
        replace: true // Replace all existing properties
      }
      
      // Send to API to create properties
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(dashboardData)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Saved ${result.count} properties to session`)
        
        // Update properties with URLs if needed
        for (let i = 0; i < result.properties.length; i++) {
          if (selectedProperties[i]?.airbnbUrl) {
            await fetch(`/api/properties/${result.properties[i].id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ airbnbUrl: selectedProperties[i].airbnbUrl })
            })
          }
        }
        
        // Clear sessionStorage since we've saved to server
        sessionStorage.removeItem('uploadData')
        sessionStorage.removeItem('propertyMappings')
      } else {
        console.error('Failed to save properties to API')
        alert('Failed to save properties. Please try again.')
        setAnalyzing(false)
        return
      }
    } catch (error) {
      console.error('Error saving to PropertyStore:', error)
      alert('Error saving properties. Please try again.')
      setAnalyzing(false)
      return
    }
    
    try {
      // Call Gemini API for analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          properties: selectedProperties,
          totalRevenue: selectedProperties.reduce((sum, p) => sum + p.revenue, 0),
          activeCount: selectedProperties.filter(p => p.status === 'active').length,
          inactiveCount: selectedProperties.filter(p => p.status === 'inactive').length
        })
      })
      
      if (response.ok) {
        const analysis = await response.json()
        // Store AI analysis in session via API
        await fetch('/api/session/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ aiAnalysis: analysis })
        })
      } else {
        // Fallback to mock analysis if API fails
        const mockAnalysis = generateMockAnalysis(selectedProperties)
        await fetch('/api/session/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ aiAnalysis: mockAnalysis })
        })
      }
    } catch (error) {
      console.error('Analysis error:', error)
      // Use mock analysis as fallback
      const mockAnalysis = generateMockAnalysis(selectedProperties)
      await fetch('/api/session/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ aiAnalysis: mockAnalysis })
      })
    }
    
    // Navigate directly to properties
    router.push('/properties')
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
                <CardTitle>Property Selection & URLs</CardTitle>
                <CardDescription>
                  Add Airbnb URLs and select properties for analysis
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {properties.filter(p => p.airbnbUrl).length}/{properties.length} URLs
                </span>
                <div className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Format: airbnb.com/rooms/123456</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkUrlPaste}
                  title="Paste multiple URLs at once (one per line)"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Bulk Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                >
                  {properties.every(p => p.selected) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.map((property, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all ${
                    property.selected 
                      ? property.status === 'active' 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-orange-50 border-orange-300'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={property.selected}
                        onChange={() => togglePropertySelection(index)}
                        className="w-5 h-5 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
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
                          {property.airbnbUrl && (
                            <LinkIcon className="w-4 h-4 text-green-600" aria-hidden="true" />
                          )}
                        </div>
                        {property.csvName && (
                          <p className="text-sm text-gray-500">CSV: {property.csvName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {property.nightsBooked} nights • {property.avgNightStay > 0 ? `${property.avgNightStay.toFixed(1)} avg stay` : 'avg stay N/A'}
                          {!property.hasAccurateMetrics && ' (est.)'}
                        </p>
                        
                        {/* URL Input Field */}
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="url"
                            placeholder="https://www.airbnb.com/rooms/..."
                            value={property.airbnbUrl || ''}
                            onChange={(e) => updatePropertyUrl(index, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-sm ${
                              property.airbnbUrl && !property.airbnbUrl.includes('airbnb.com/rooms/') 
                                ? 'border-red-300 focus:border-red-500' 
                                : ''
                            }`}
                            title="Enter the full Airbnb listing URL (e.g., https://www.airbnb.com/rooms/12345678)"
                          />
                          {property.airbnbUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(property.airbnbUrl, '_blank')
                              }}
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">
                        ${(property.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-500">{property.status}</p>
                    </div>
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