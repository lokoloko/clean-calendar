'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Star,
  Home,
  Moon,
  ArrowLeft,
  Lock,
  Search,
  ExternalLink,
  RefreshCw,
  MapPin,
  Users,
  Calendar,
  Loader2,
  Crown,
  AlertCircle
} from 'lucide-react'
import { getUserTier, canAccessFeature } from '@/lib/user-tier'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AirbnbListingData } from '@/lib/scrapers/airbnb-parser'
import { formatCurrency } from '@/lib/utils'

interface PropertyComparison {
  property: {
    name: string
    url?: string
    // From PDF
    revenue: number
    // From CSV
    nightsBooked?: number
    avgStayLength?: number
    occupancyRate?: number
    avgNightlyRate?: number
    health?: number
    hasAccurateMetrics?: boolean
    dataSource?: string
    // From Browserless
    liveData?: AirbnbListingData
    lastScraped?: Date
  }
  competitors: Array<{
    title: string
    price: number
    rating: number
    distance?: string
    url?: string
  }>
  analysis: {
    pricePosition: 'below' | 'average' | 'above'
    priceGap?: number
    ratingComparison: 'below' | 'average' | 'above'
    recommendations: string[]
  }
}

export default function ComparisonPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [propertyUrl, setPropertyUrl] = useState('')
  const [comparison, setComparison] = useState<PropertyComparison | null>(null)
  const [comparing, setComparing] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Check access
    const canAccess = canAccessFeature('propertyComparison')
    setHasAccess(canAccess)
    
    if (!canAccess) {
      setLoading(false)
      return
    }

    // Load properties from session
    const uploadData = sessionStorage.getItem('uploadData')
    if (!uploadData) {
      router.push('/')
      return
    }

    const parsed = JSON.parse(uploadData)
    if (parsed.properties) {
      setProperties(parsed.properties)
      if (parsed.properties.length > 0) {
        setSelectedProperty(parsed.properties[0].name)
      }
    }
    
    setLoading(false)
  }, [router])

  const handleCompare = async () => {
    if (!selectedProperty || !propertyUrl) return
    
    setComparing(true)
    
    try {
      // First, scrape the Airbnb data
      const scrapeResponse = await fetch('/api/scrape/airbnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: propertyUrl,
          propertyId: selectedProperty
        })
      })
      
      if (!scrapeResponse.ok) {
        console.error('Scraping failed')
        return
      }
      
      const scrapeData = await scrapeResponse.json()
      
      if (!scrapeData.success) {
        console.error('Scraping error:', scrapeData.error)
        return
      }
      
      // Combine scraped data with existing property data
      const propertyData = properties.find(p => p.name === selectedProperty)
      
      // Create comparison object
      const comparisonData: PropertyComparison = {
        property: {
          ...propertyData,
          liveData: scrapeData.data,
          lastScraped: new Date()
        },
        competitors: [], // TODO: Implement competitor search
        analysis: {
          pricePosition: 'average',
          priceGap: 0,
          ratingComparison: 'average',
          recommendations: []
        }
      }
      
      // Analyze price position
      if (scrapeData.data?.price?.nightly && propertyData?.avgNightlyRate) {
        const priceDiff = ((scrapeData.data.price.nightly - propertyData.avgNightlyRate) / propertyData.avgNightlyRate) * 100
        comparisonData.analysis.priceGap = Math.round(priceDiff)
        comparisonData.analysis.pricePosition = priceDiff > 10 ? 'above' : priceDiff < -10 ? 'below' : 'average'
      }
      
      // Generate recommendations
      const recommendations = []
      
      if (scrapeData.data?.reviews?.overall < 4.5) {
        recommendations.push('Consider improving guest experience to boost reviews above 4.5 stars')
      }
      
      if (scrapeData.data?.amenities?.all?.length < 20) {
        recommendations.push('Add more amenities to compete with similar properties (aim for 20+ amenities)')
      }
      
      if (!scrapeData.data?.host?.isSuperhost) {
        recommendations.push('Work towards Superhost status to increase booking appeal and pricing power')
      }
      
      if (scrapeData.data?.availability?.instantBook === false) {
        recommendations.push('Enable Instant Book to increase visibility and bookings')
      }
      
      if (comparisonData.analysis.pricePosition === 'below') {
        recommendations.push('Your pricing is below market average - consider increasing rates by 10-15%')
      }
      
      comparisonData.analysis.recommendations = recommendations
      
      setComparison(comparisonData)
    } catch (error) {
      console.error('Error comparing property:', error)
    } finally {
      setComparing(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <GoStudioMLogo width={240} height={72} />
                <div className="border-l pl-4 ml-2">
                  <h1 className="text-xl font-semibold text-gray-900">Property Comparison</h1>
                </div>
              </div>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-8 text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h2 className="text-2xl font-bold mb-2">Pro Feature</h2>
              <p className="text-gray-600 mb-6">
                Property Comparison with live market data is available for Pro users only.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="text-left">
                  <h3 className="font-semibold mb-2">Included with Pro:</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>✓ Live pricing from Airbnb</li>
                    <li>✓ Competitor analysis</li>
                    <li>✓ Market positioning</li>
                    <li>✓ Pricing recommendations</li>
                    <li>✓ Review comparisons</li>
                  </ul>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold mb-2">Data Sources:</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Your PDF reports</li>
                    <li>• Transaction CSV data</li>
                    <li>• Live Airbnb scraping</li>
                    <li>• Competitor listings</li>
                  </ul>
                </div>
              </div>
              <Button className="bg-amber-600 hover:bg-amber-700">
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading comparison data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GoStudioMLogo width={240} height={72} />
              <div className="border-l pl-4 ml-2">
                <h1 className="text-xl font-semibold text-gray-900">Property Comparison</h1>
                <p className="text-sm text-gray-500">Live market analysis</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Property Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Property to Compare</CardTitle>
            <CardDescription>
              Choose a property and provide its Airbnb URL for live market comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="property">Property</Label>
                <select
                  id="property"
                  className="w-full mt-1 p-2 border rounded-md"
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                >
                  {properties.map((prop) => (
                    <option key={prop.name} value={prop.name}>
                      {prop.name} - ${prop.revenue?.toLocaleString() || 0}
                    </option>
                  ))}
                </select>
                {selectedProperty && (
                  <div className="mt-2 text-sm text-gray-600">
                    {properties.find(p => p.name === selectedProperty)?.nightsBooked || 'N/A'} nights • 
                    {properties.find(p => p.name === selectedProperty)?.avgNightStay?.toFixed(1) || 'N/A'} avg stay
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="url">Airbnb Listing URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.airbnb.com/rooms/..."
                  value={propertyUrl}
                  onChange={(e) => setPropertyUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the full Airbnb URL for this property
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={handleCompare} 
                disabled={!selectedProperty || !propertyUrl || comparing}
                className="w-full"
              >
                {comparing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Market Position...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Compare with Market
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparison && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Your Revenue</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(comparison.property.revenue)}
                      </p>
                      {comparison.property.nightsBooked && (
                        <p className="text-xs text-gray-400">
                          {comparison.property.nightsBooked.toLocaleString()} nights
                        </p>
                      )}
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Current Price</p>
                      <p className="text-2xl font-bold">
                        ${comparison.property.liveData?.price?.nightly || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">per night</p>
                    </div>
                    <Home className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="text-2xl font-bold">
                        {comparison.property.liveData?.reviews?.overall || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {comparison.property.liveData?.reviews?.count || 0} reviews
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Market Position</p>
                      <p className="text-2xl font-bold">
                        {comparison.analysis.pricePosition === 'above' ? 'Premium' :
                         comparison.analysis.pricePosition === 'below' ? 'Budget' : 'Average'}
                      </p>
                      {comparison.analysis.priceGap && (
                        <p className="text-xs text-gray-400">
                          {comparison.analysis.priceGap > 0 ? '+' : ''}{comparison.analysis.priceGap}% vs hist
                        </p>
                      )}
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Property Data */}
            <Tabs defaultValue="amenities" className="mb-8">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="rules">House Rules</TabsTrigger>
                <TabsTrigger value="host">Host Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="amenities">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Amenities</CardTitle>
                    <CardDescription>
                      {comparison.property.liveData?.amenities?.all?.length || 0} amenities available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparison.property.liveData?.amenities?.highlights && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Featured Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {comparison.property.liveData.amenities.highlights.map((item, i) => (
                            <Badge key={i} variant="secondary">{item}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {comparison.property.liveData?.amenities?.all && (
                      <div>
                        <p className="text-sm font-medium mb-2">All Amenities</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {comparison.property.liveData.amenities.all.map((item, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className="text-green-600">✓</span> {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>Review Analysis</CardTitle>
                    <CardDescription>
                      {comparison.property.liveData?.reviews?.count || 0} total reviews
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparison.property.liveData?.reviews?.distribution && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(comparison.property.liveData.reviews.distribution).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-sm text-gray-500 capitalize">{key.replace('_', ' ')}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-semibold">{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="rules">
                <Card>
                  <CardHeader>
                    <CardTitle>House Rules & Policies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Check-in/Check-out</p>
                        <div className="space-y-1 text-sm">
                          <p>Check-in: {comparison.property.liveData?.houseRules?.checkIn || 'Not specified'}</p>
                          <p>Check-out: {comparison.property.liveData?.houseRules?.checkOut || 'Not specified'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Policies</p>
                        <div className="space-y-1 text-sm">
                          <p>Pets: {comparison.property.liveData?.houseRules?.pets ? '✓ Allowed' : '✗ Not allowed'}</p>
                          <p>Smoking: {comparison.property.liveData?.houseRules?.smoking ? '✓ Allowed' : '✗ Not allowed'}</p>
                          <p>Parties: {comparison.property.liveData?.houseRules?.parties ? '✓ Allowed' : '✗ Not allowed'}</p>
                        </div>
                      </div>
                    </div>
                    {comparison.property.liveData?.cancellation?.type && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-1">Cancellation Policy</p>
                        <p className="text-sm capitalize">{comparison.property.liveData.cancellation.type}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="host">
                <Card>
                  <CardHeader>
                    <CardTitle>Host Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparison.property.liveData?.host?.name && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Host</span>
                          <span className="font-medium">
                            {comparison.property.liveData.host.name}
                            {comparison.property.liveData.host.isSuperhost && (
                              <Badge className="ml-2" variant="default">Superhost</Badge>
                            )}
                          </span>
                        </div>
                      )}
                      {comparison.property.liveData?.host?.responseRate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Response Rate</span>
                          <span>{comparison.property.liveData.host.responseRate}</span>
                        </div>
                      )}
                      {comparison.property.liveData?.host?.responseTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Response Time</span>
                          <span>{comparison.property.liveData.host.responseTime}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Market-Based Recommendations</CardTitle>
                <CardDescription>
                  AI-powered suggestions based on competitor analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparison.analysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}