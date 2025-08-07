'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AddCSVModal } from '@/components/AddCSVModal'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  DollarSign,
  Home,
  Moon,
  Activity,
  Download,
  FileText,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Crown
} from 'lucide-react'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { calculateHealthScore, getHealthColor, getHealthBgColor, getHealthBorderColor } from '@/lib/analytics/health-score'
import { generateInsights, getInsightIcon, getInsightColor, type AIInsight } from '@/lib/ai/insights'
import { ReportGenerator } from '@/lib/reports/report-generator'
import { format } from 'date-fns'
import { getUserTier, canAccessFeature, getRemainingQuota, incrementUsage } from '@/lib/user-tier'
import { TierSelector } from '@/components/TierSelector'

interface Property {
  name: string
  revenue: number
  nightsBooked: number
  avgNightStay: number
  status: 'active' | 'inactive'
  healthScore?: number
  healthStatus?: string
  recommendations?: string[]
  hasAccurateMetrics?: boolean
}

interface DashboardData {
  totalRevenue: number
  activeProperties: number
  inactiveProperties: number
  totalProperties: number
  totalNights: number
  dateRange?: string
  properties: Property[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [propertyRecommendations, setPropertyRecommendations] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dataSource, setDataSource] = useState<'pdf-only' | 'pdf-csv'>('pdf-only')
  const [historicalData, setHistoricalData] = useState<any>(null)
  const [showAddCSVModal, setShowAddCSVModal] = useState(false)
  const [sortColumn, setSortColumn] = useState<'name' | 'revenue' | 'nights' | 'avgStay' | 'health'>('health')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free')
  
  const handleSort = (column: 'name' | 'revenue' | 'nights' | 'avgStay' | 'health') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(column === 'name' ? 'asc' : 'desc')
    }
  }
  
  const handleCSVUpload = async (csvFile: File) => {
    try {
      // Get existing PDF data from session
      const uploadData = sessionStorage.getItem('uploadData')
      if (!uploadData) return
      
      const existingData = JSON.parse(uploadData)
      
      // Create form data with just the CSV
      const formData = new FormData()
      formData.append('csv', csvFile)
      
      // If we have PDF data, send it as metadata to help with date filtering
      if (existingData.pdf) {
        formData.append('pdfData', JSON.stringify({
          dateRange: existingData.pdf.dateRange,
          properties: existingData.pdf.properties
        }))
      }
      
      // Upload and process CSV
      const response = await fetch('/api/upload/csv', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Merge CSV data with existing data
        const mergedData = {
          ...existingData,
          csv: result.data.csv,
          dataSource: 'pdf-csv',
          properties: result.data.properties || existingData.properties
        }
        
        // Update session storage
        sessionStorage.setItem('uploadData', JSON.stringify(mergedData))
        
        // Reload the page to show updated data
        window.location.reload()
      } else {
        throw new Error(result.error || 'Failed to process CSV')
      }
    } catch (error) {
      console.error('CSV upload error:', error)
      throw error
    }
  }
  
  const fetchPropertyRecommendations = async (properties: any[], marketContext: any) => {
    try {
      const response = await fetch('/api/ai/property-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties, marketContext })
      })
      
      if (response.ok) {
        const recommendations = await response.json()
        // Convert array to object for easy lookup
        const recMap: any = {}
        recommendations.forEach((rec: any) => {
          recMap[rec.propertyName] = rec.recommendations
        })
        setPropertyRecommendations(recMap)
        console.log('Loaded Gemini recommendations for properties')
      }
    } catch (error) {
      console.error('Failed to fetch property recommendations:', error)
    }
  }

  useEffect(() => {
    // Check user tier
    const user = getUserTier()
    setUserTier(user.tier)
    
    // Get selected properties from mapping page
    const propertyMappings = sessionStorage.getItem('propertyMappings')
    const uploadData = sessionStorage.getItem('uploadData')
    
    // Use selected properties if available, otherwise fall back to all properties
    const dataSource = propertyMappings || uploadData
    
    if (dataSource) {
      const parsed = JSON.parse(dataSource)
      
      // Determine if we're using selected properties or all properties
      const properties = propertyMappings ? parsed : parsed.properties
      
      if (!properties || properties.length === 0) {
        setLoading(false)
        return
      }
      
      // Calculate health scores for each property
      const propertiesWithHealth = properties.map((prop: any) => {
        // Handle different property data structures
        const revenue = prop.revenue || prop.netEarnings || 0
        const nightsBooked = prop.nightsBooked || Math.round(revenue / 150)
        
        // Only use avgNightStay if it's actually available (> 0)
        const avgStay = prop.avgNightStay > 0 ? prop.avgNightStay : 0
        
        const health = calculateHealthScore({
          name: prop.pdfName || prop.name,
          revenue: revenue,
          nightsBooked: nightsBooked,
          avgNightStay: avgStay || 3.0 // Use 3.0 as fallback for health calculation only
        })
        
        return {
          name: prop.pdfName || prop.name,
          revenue: revenue,
          nightsBooked: nightsBooked,
          avgNightStay: avgStay, // Store 0 if not available
          status: prop.status || (revenue > 0 ? 'active' : 'inactive'),
          healthScore: health.score,
          healthStatus: health.status,
          recommendations: health.recommendations,
          hasAccurateMetrics: prop.hasAccurateMetrics || false
        }
      })
      
      // Get original PDF totals from upload data
      const uploadDataForTotals = sessionStorage.getItem('uploadData')
      let totalRevenue = propertiesWithHealth.reduce((sum, p) => sum + p.revenue, 0)
      let totalNights = propertiesWithHealth.reduce((sum, p) => sum + p.nightsBooked, 0)
      let dateRange = undefined
      
      // Use PDF totals if available (they include all properties, not just selected)
      if (uploadDataForTotals) {
        const uploadParsed = JSON.parse(uploadDataForTotals)
        
        // Set data source
        if (uploadParsed.dataSource) {
          setDataSource(uploadParsed.dataSource)
        }
        
        // Check for historical data
        if (uploadParsed.csv?.historicalData) {
          setHistoricalData(uploadParsed.csv.historicalData)
          console.log('Historical data available:', uploadParsed.csv.historicalData)
        }
        
        if (uploadParsed.pdf) {
          // Use actual PDF totals
          totalRevenue = uploadParsed.pdf.totalNetEarnings || totalRevenue
          totalNights = uploadParsed.pdf.totalNightsBooked || totalNights
          dateRange = uploadParsed.pdf.dateRange || uploadParsed.pdf.period
          console.log('Using PDF totals:', { totalRevenue, totalNights, dateRange })
          console.log('Data source:', uploadParsed.dataSource)
        }
      }
      
      // Get total properties count from PDF
      let totalProperties = propertiesWithHealth.length
      if (uploadDataForTotals) {
        const uploadParsed = JSON.parse(uploadDataForTotals)
        if (uploadParsed.pdf?.properties) {
          totalProperties = uploadParsed.pdf.properties.length
        }
      }
      
      const activeProperties = propertiesWithHealth.filter(p => p.status === 'active').length
      const inactiveProperties = totalProperties - activeProperties
      
      const dashboardData = {
        totalRevenue,
        activeProperties,
        inactiveProperties,
        totalProperties,
        totalNights,
        dateRange,
        properties: propertiesWithHealth
      }
      
      setData(dashboardData)
      
      // Generate AI insights
      generateInsights(dashboardData).then(setInsights)
      
      // Fetch Gemini recommendations for each property
      const validAvgStays = propertiesWithHealth.filter(p => p.avgNightStay > 0)
      const avgStayForContext = validAvgStays.length > 0 
        ? validAvgStays.reduce((sum, p) => sum + p.avgNightStay, 0) / validAvgStays.length
        : 3.0 // Default if no valid data
      
      fetchPropertyRecommendations(propertiesWithHealth, {
        totalProperties: properties.length,
        avgRevenue: totalRevenue / Math.max(activeProperties, 1),
        avgOccupancy: totalNights / Math.max(activeProperties, 1),
        avgStay: avgStayForContext
      })
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

  // Sort properties based on selected column and direction
  const sortedProperties = [...data.properties].sort((a, b) => {
    let aVal, bVal
    
    switch (sortColumn) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      
      case 'revenue':
        aVal = a.revenue
        bVal = b.revenue
        break
      
      case 'nights':
        aVal = a.nightsBooked
        bVal = b.nightsBooked
        break
      
      case 'avgStay':
        // Treat 0 (N/A) as lowest value for sorting
        aVal = a.avgNightStay || -1
        bVal = b.avgNightStay || -1
        break
      
      case 'health':
      default:
        aVal = a.healthScore || 0
        bVal = b.healthScore || 0
        break
    }
    
    if (sortColumn !== 'name') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }
    return 0
  })

  const criticalProperties = sortedProperties.filter(p => p.healthStatus === 'critical')
  const warningProperties = sortedProperties.filter(p => p.healthStatus === 'warning')
  const healthyProperties = sortedProperties.filter(p => p.healthStatus === 'healthy')

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!data) return
    
    // Check if user can export
    if (!canAccessFeature('exports')) {
      alert('Export feature is available for Pro users. Please upgrade to export reports.')
      return
    }
    
    const remaining = getRemainingQuota('exports')
    if (remaining === 0) {
      alert('You have reached your monthly export limit. Please upgrade to Pro for unlimited exports.')
      return
    }
    
    setExportLoading(true)
    setShowExportMenu(false)
    
    try {
      // Prepare report data
      const reportData = {
        month: format(new Date(), 'MMMM yyyy'),
        totalRevenue: data.totalRevenue,
        totalFees: data.properties.reduce((sum, p) => sum + (p.revenue * 0.03), 0), // Estimate 3% fees
        totalNet: data.totalRevenue,
        activeProperties: data.activeProperties,
        inactiveProperties: data.inactiveProperties,
        properties: data.properties.map(p => ({
          name: p.name,
          revenue: p.revenue,
          fees: p.revenue * 0.03,
          net: p.revenue * 0.97,
          nightsBooked: p.nightsBooked,
          occupancyRate: Math.round((p.nightsBooked / 30) * 100),
          healthScore: p.healthScore || 0,
          status: p.healthStatus as 'healthy' | 'warning' | 'critical',
          insights: p.recommendations
        })),
        insights: insights.map(i => `${i.title}: ${i.description}`)
      }
      
      // Generate report
      let blob: Blob
      let filename: string
      
      if (type === 'pdf') {
        blob = await ReportGenerator.generatePDF(reportData)
        filename = `airbnb-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      } else {
        blob = await ReportGenerator.generateExcel(reportData)
        filename = `airbnb-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      }
      
      // Download file
      ReportGenerator.downloadFile(blob, filename)
      
      // Increment usage
      incrementUsage('exports')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tier Selector for Testing */}
      <TierSelector />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GoStudioMLogo width={240} height={72} />
              <div className="border-l pl-4 ml-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">Smart Analytics Dashboard</h1>
                  {userTier === 'pro' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      <Crown className="w-3 h-3 mr-1" />
                      Pro
                    </span>
                  )}
                  {userTier === 'enterprise' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Enterprise
                    </span>
                  )}
                </div>
                {data.dateRange && (
                  <p className="text-sm text-gray-500">{data.dateRange}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Button 
                  variant="outline"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exportLoading}
                  className="flex items-center gap-2"
                >
                  {exportLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Report
                    </>
                  )}
                </Button>
                
                {showExportMenu && !exportLoading && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                    >
                      <FileText className="w-4 h-4" />
                      Export as PDF
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-md"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export as Excel
                    </button>
                  </div>
                )}
              </div>
              <Button>Add More Data</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Data Quality Badge */}
        {dataSource === 'pdf-csv' && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-900">CSV Data Verified</span>
              <span className="text-sm text-green-700">All property metrics are accurate from transaction records</span>
            </div>
          </div>
        )}
        {dataSource === 'pdf-only' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-amber-900">Estimated Metrics</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Property nights and average stays are estimated from revenue data
                  </p>
                </div>
              </div>
              <div className="text-right">
                {userTier === 'free' ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="opacity-75"
                      title="Pro feature - Upgrade to upload CSV data"
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      Upload CSV (Pro)
                    </Button>
                    <p className="text-xs text-amber-600 mt-1">
                      Upgrade for accurate metrics
                    </p>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAddCSVModal(true)}
                      title="Download from Airbnb: Account → Transaction History → Export CSV"
                    >
                      Upload CSV for Accuracy
                    </Button>
                    <p className="text-xs text-amber-600 mt-1">
                      Airbnb → Transaction History → Export
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Historical Data Upsell Card */}
        {historicalData && historicalData.yearlyBreakdown && historicalData.yearlyBreakdown.length > 1 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">
                    {historicalData.yearlyBreakdown.length} Years of Historical Data Available!
                  </h3>
                </div>
                <p className="text-sm text-purple-700 mb-2">
                  Your CSV contains data from {historicalData.dateRange.start} to {historicalData.dateRange.end}
                </p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="font-semibold text-purple-900">Total Historical Revenue:</span>
                    <span className="ml-2 text-purple-700">
                      ${historicalData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-900">Total Nights:</span>
                    <span className="ml-2 text-purple-700">
                      {historicalData.totalNights.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-900">Years:</span>
                    <span className="ml-2 text-purple-700">
                      {historicalData.yearlyBreakdown.map(y => y.year).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {userTier === 'free' ? (
                  <>
                    <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                    <span className="text-xs text-purple-600 text-center">Unlock Full History</span>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="default" 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => router.push('/historical')}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Historical Analytics
                    </Button>
                    <span className="text-xs text-purple-600 text-center">Pro Feature</span>
                  </>
                )}
              </div>
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
                  <p className="text-xs text-gray-400">of {data.totalProperties} total</p>
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
                  <p className="text-2xl font-bold text-gray-900">{data.totalNights.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{data.dateRange ? 'Total booked' : 'This period'}</p>
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
                    <th 
                      className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('name')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Property
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('revenue')}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Revenue
                        {sortColumn === 'revenue' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('nights')}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Nights
                        {dataSource === 'pdf-only' && (
                          <span className="text-xs font-normal text-gray-400" title="Estimated based on revenue">*</span>
                        )}
                        {dataSource === 'pdf-csv' && (
                          <span className="text-xs font-semibold text-green-600" title="Accurate data from transaction CSV">✓</span>
                        )}
                        {sortColumn === 'nights' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('avgStay')}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Avg Stay
                        {dataSource === 'pdf-only' && (
                          <span className="text-xs font-normal text-gray-400" title="Portfolio average">**</span>
                        )}
                        {dataSource === 'pdf-csv' && (
                          <span className="text-xs font-semibold text-green-600" title="Accurate data from transaction CSV">✓</span>
                        )}
                        {sortColumn === 'avgStay' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    </th>
                    <th 
                      className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('health')}
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Health
                        {sortColumn === 'health' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    </th>
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
                        {property.nightsBooked.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4">
                        {property.avgNightStay > 0 ? property.avgNightStay.toFixed(1) : 'N/A'}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className={`inline-flex items-center justify-center w-16 h-8 rounded-full ${getHealthBgColor(property.healthScore || 0)} ${getHealthBorderColor(property.healthScore || 0)} border`}>
                          <span className={`font-bold ${getHealthColor(property.healthScore || 0)}`}>
                            {property.healthScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {propertyRecommendations[property.name] ? (
                          <ul className="text-sm text-gray-600">
                            {propertyRecommendations[property.name].slice(0, 2).map((rec: string, i: number) => (
                              <li key={i} className="mb-1" title={rec}>
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        ) : property.recommendations && property.recommendations.length > 0 ? (
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
            {dataSource === 'pdf-only' && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 space-y-1">
                  <span className="block">* Individual property nights are estimated based on revenue. Total portfolio nights ({data.totalNights}) is accurate.</span>
                  <span className="block">** Individual property average stays cannot be extracted from the PDF format. Shows "N/A" for properties without CSV data.</span>
                  <span className="block mt-2 text-blue-600 font-semibold">💡 Upload your transaction CSV for accurate property-level metrics including average stay length</span>
                </p>
              </div>
            )}
            {dataSource === 'pdf-csv' && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-green-600 font-semibold">
                  ✓ Property metrics verified with transaction data - all nights and average stays are accurate
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights & Recommendations */}
        {insights.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Insights & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <Card key={index} className={`border ${getInsightColor(insight.type)}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl flex-shrink-0">{getInsightIcon(insight.type)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 text-sm">{insight.title}</h3>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-3">{insight.description}</p>
                        {insight.impact && (
                          <p className="text-xs font-semibold text-gray-900">{insight.impact}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {insights.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  View All {insights.length} Insights
                </Button>
              </div>
            )}
          </div>
        )}

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
        
        {/* Add CSV Modal */}
        <AddCSVModal 
          isOpen={showAddCSVModal}
          onClose={() => setShowAddCSVModal(false)}
          onUpload={handleCSVUpload}
        />
      </div>
    </div>
  )
}