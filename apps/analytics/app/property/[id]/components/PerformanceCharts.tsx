'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Property } from '@/lib/storage/property-store'
import { formatCurrency } from '@/lib/utils'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface PerformanceChartsProps {
  property: Property
}

export default function PerformanceCharts({ property }: PerformanceChartsProps) {
  // Generate mock data for charts
  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const baseRevenue = (property.metrics?.revenue.value || 40000) / 12
    
    return months.map(month => ({
      month,
      revenue: Math.round(baseRevenue * (0.7 + Math.random() * 0.6)),
      nights: Math.round(20 + Math.random() * 10),
      occupancy: Math.round(60 + Math.random() * 30),
      avgRate: Math.round(150 + Math.random() * 50)
    }))
  }
  
  const generateBookingPatterns = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map(day => ({
      day,
      bookings: Math.round(10 + Math.random() * 20),
      revenue: Math.round(1000 + Math.random() * 2000)
    }))
  }
  
  const generateStayLengthData = () => {
    return [
      { name: '1-2 nights', value: 35, color: '#3B82F6' },
      { name: '3-4 nights', value: 30, color: '#10B981' },
      { name: '5-7 nights', value: 20, color: '#F59E0B' },
      { name: '7+ nights', value: 15, color: '#8B5CF6' }
    ]
  }
  
  const monthlyData = generateMonthlyData()
  const bookingPatterns = generateBookingPatterns()
  const stayLengthData = generateStayLengthData()
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Analytics</CardTitle>
        <CardDescription>
          Historical performance and trends for your property
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="stays">Stay Length</TabsTrigger>
          </TabsList>
          
          {/* Revenue Chart */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(property.metrics?.revenue.value || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Monthly Average</p>
                <p className="text-2xl font-bold">
                  {formatCurrency((property.metrics?.revenue.value || 0) / 12)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Best Month</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(Math.max(...monthlyData.map(d => d.revenue)))}
                </p>
              </div>
            </div>
          </TabsContent>
          
          {/* Occupancy Chart */}
          <TabsContent value="occupancy" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="occupancy" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Occupancy %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="nights" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="Nights Booked"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Average Occupancy</p>
                <p className="text-2xl font-bold">
                  {property.metrics?.occupancy.value.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Nights</p>
                <p className="text-2xl font-bold">
                  {property.dataSources.pdf?.data.totalNightsBooked || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Peak Season</p>
                <p className="text-2xl font-bold">Jun-Aug</p>
              </div>
            </div>
          </TabsContent>
          
          {/* Booking Patterns */}
          <TabsContent value="patterns" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Popular Check-in Days</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Friday</span>
                    <span className="font-semibold">45%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Saturday</span>
                    <span className="font-semibold">30%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Thursday</span>
                    <span className="font-semibold">15%</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Booking Lead Time</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>0-7 days</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>8-30 days</span>
                    <span className="font-semibold">50%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>30+ days</span>
                    <span className="font-semibold">25%</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Stay Length Distribution */}
          <TabsContent value="stays" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stayLengthData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stayLengthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Average Stay</p>
                <p className="text-2xl font-bold">
                  {property.dataSources.csv 
                    ? `${property.metrics?.occupancy.value.toFixed(1)} nights`
                    : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Most Common</p>
                <p className="text-2xl font-bold">2-3 nights</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}