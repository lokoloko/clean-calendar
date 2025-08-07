'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Home,
  Moon,
  ArrowLeft,
  Lock,
  Download
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { getUserTier, canAccessFeature } from '@/lib/user-tier'

interface YearlyData {
  year: number
  revenue: number
  nights: number
  bookings: number
  avgStayLength: number
  properties: Set<string>
}

interface PropertyPerformance {
  name: string
  totalRevenue: number
  totalNights: number
  avgRevenue: number
  trend: 'up' | 'down' | 'stable'
}

export default function HistoricalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([])
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Check access
    const canAccess = canAccessFeature('historicalAnalytics')
    setHasAccess(canAccess)
    
    if (!canAccess) {
      setLoading(false)
      return
    }

    // Load historical data from session
    const uploadData = sessionStorage.getItem('uploadData')
    if (!uploadData) {
      router.push('/')
      return
    }

    const parsed = JSON.parse(uploadData)
    if (!parsed.csv?.historicalData) {
      router.push('/dashboard')
      return
    }

    const historical = parsed.csv.historicalData
    
    // Process yearly breakdown
    const yearly = historical.yearlyBreakdown.map((year: any) => ({
      year: year.year,
      revenue: year.revenue,
      nights: year.nights,
      bookings: year.bookings,
      avgStayLength: year.avgStayLength,
      properties: new Set(year.properties)
    }))
    
    setYearlyData(yearly)
    
    // Calculate property performance over time
    if (parsed.csv.propertyMetrics) {
      const perfMap = new Map<string, PropertyPerformance>()
      
      parsed.csv.propertyMetrics.forEach((metric: any) => {
        const perf: PropertyPerformance = {
          name: metric.name,
          totalRevenue: metric.totalRevenue,
          totalNights: metric.totalNights,
          avgRevenue: metric.totalRevenue / Math.max(metric.bookingCount, 1),
          trend: 'stable' // Calculate based on recent years
        }
        perfMap.set(metric.name, perf)
      })
      
      setPropertyPerformance(Array.from(perfMap.values()))
    }
    
    setLoading(false)
  }, [router])

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <GoStudioMLogo width={240} height={72} />
                <div className="border-l pl-4 ml-2">
                  <h1 className="text-xl font-semibold text-gray-900">Historical Analytics</h1>
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
              <Lock className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h2 className="text-2xl font-bold mb-2">Pro Feature</h2>
              <p className="text-gray-600 mb-6">
                Historical analytics is available for Pro users only.
                Unlock insights from your entire rental history.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="text-left">
                  <h3 className="font-semibold mb-2">Included with Pro:</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>✓ Multi-year trend analysis</li>
                    <li>✓ Seasonal patterns</li>
                    <li>✓ Property performance over time</li>
                    <li>✓ Revenue forecasting</li>
                    <li>✓ Export historical reports</li>
                  </ul>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold mb-2">Your Data:</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Multiple years available</li>
                    <li>• Complete transaction history</li>
                    <li>• All properties included</li>
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
        <p>Loading historical data...</p>
      </div>
    )
  }

  const chartData = yearlyData.map(year => ({
    year: year.year.toString(),
    Revenue: year.revenue,
    Nights: year.nights,
    'Avg Stay': year.avgStayLength
  }))

  const currentYear = yearlyData[yearlyData.length - 1]
  const previousYear = yearlyData[yearlyData.length - 2]
  const revenueGrowth = previousYear 
    ? ((currentYear.revenue - previousYear.revenue) / previousYear.revenue * 100).toFixed(1)
    : 0

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GoStudioMLogo width={240} height={72} />
              <div className="border-l pl-4 ml-2">
                <h1 className="text-xl font-semibold text-gray-900">Historical Analytics</h1>
                <p className="text-sm text-gray-500">
                  {yearlyData[0]?.year} - {yearlyData[yearlyData.length - 1]?.year} 
                  ({yearlyData.length} years)
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Historical Revenue</p>
                  <p className="text-2xl font-bold">
                    ${yearlyData.reduce((sum, y) => sum + y.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% YoY
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
                  <p className="text-sm text-gray-500">Total Nights Booked</p>
                  <p className="text-2xl font-bold">
                    {yearlyData.reduce((sum, y) => sum + y.nights, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">All time</p>
                </div>
                <Moon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Properties</p>
                  <p className="text-2xl font-bold">
                    {currentYear?.properties.size || 0}
                  </p>
                  <p className="text-xs text-gray-400">Current year</p>
                </div>
                <Home className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Years in Business</p>
                  <p className="text-2xl font-bold">{yearlyData.length}</p>
                  <p className="text-xs text-gray-400">
                    Since {yearlyData[0]?.year}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Year-over-year revenue performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Nights and Occupancy */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Nights Booked</CardTitle>
              <CardDescription>Annual booking nights</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Nights" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Stay Length</CardTitle>
              <CardDescription>Nights per booking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)} nights`} />
                  <Line 
                    type="monotone" 
                    dataKey="Avg Stay" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Year by Year Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Yearly Performance</CardTitle>
            <CardDescription>Detailed breakdown by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Year</th>
                    <th className="text-right py-3 px-4">Revenue</th>
                    <th className="text-right py-3 px-4">Growth</th>
                    <th className="text-right py-3 px-4">Nights</th>
                    <th className="text-right py-3 px-4">Bookings</th>
                    <th className="text-right py-3 px-4">Avg Stay</th>
                    <th className="text-right py-3 px-4">Properties</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((year, index) => {
                    const prevYear = yearlyData[index - 1]
                    const growth = prevYear 
                      ? ((year.revenue - prevYear.revenue) / prevYear.revenue * 100)
                      : 0
                      
                    return (
                      <tr key={year.year} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold">{year.year}</td>
                        <td className="text-right py-3 px-4">
                          ${year.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="text-right py-3 px-4">
                          {index > 0 && (
                            <span className={growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {growth >= 0 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                              {Math.abs(growth).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="text-right py-3 px-4">{year.nights.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{year.bookings.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{year.avgStayLength.toFixed(1)}</td>
                        <td className="text-right py-3 px-4">{year.properties.size}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}