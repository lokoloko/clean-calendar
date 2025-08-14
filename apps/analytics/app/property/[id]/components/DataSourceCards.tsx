'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Property } from '@/lib/storage/property-store'
import { calculatePeriodMetrics, type TimePeriod } from '@/lib/utils/period-metrics'
import { deduplicateTransactions } from '@/lib/utils/transaction-dedup'
import { 
  FileText, 
  Table, 
  Globe, 
  Upload, 
  RefreshCw, 
  ExternalLink,
  Download,
  Calendar,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Info
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DataSourceCardsProps {
  property: Property
  selectedPeriod?: TimePeriod
  onUploadPdf: () => void
  onUploadCsv: () => void
  onAddUrl: () => void
  onSync: () => void
}

export default function DataSourceCards({
  property,
  selectedPeriod = 'last12months',
  onUploadPdf,
  onUploadCsv,
  onAddUrl,
  onSync
}: DataSourceCardsProps) {
  const [periodMetrics, setPeriodMetrics] = useState<any>(null)
  
  useEffect(() => {
    if (property.dataSources?.csv?.data && property.dataSources.csv.data.length > 0) {
      // Calculate deduplicated metrics for the current period
      const transactions = property.dataSources.csv.data
      
      // Deduplicate all transactions to get total counts
      const { stats: allTimeStats } = deduplicateTransactions(transactions)
      
      // Calculate period-specific metrics
      const metrics = calculatePeriodMetrics(property, selectedPeriod)
      
      // For period-specific transactions, filter and deduplicate
      const now = new Date()
      let startDate: Date
      
      switch (selectedPeriod) {
        case 'last12months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 12)
          break
        case 'yearToDate':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        case 'allTime':
          startDate = new Date('2000-01-01') // Include all data
          break
        default:
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 12)
      }
      
      const periodTransactions = selectedPeriod === 'allTime' 
        ? transactions 
        : transactions.filter((t: any) => {
            if (!t.startDate) return false
            const transactionDate = new Date(t.startDate)
            return transactionDate >= startDate && transactionDate <= now
          })
      
      const { stats: periodStats } = deduplicateTransactions(periodTransactions)
      
      setPeriodMetrics({
        metrics,
        allTimeStats,
        periodStats,
        periodTransactionCount: periodTransactions.length,
        totalTransactionCount: transactions.length
      })
    }
  }, [property, selectedPeriod])
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Data Sources</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // TODO: Implement manage all data sources
            console.log('Manage all data sources')
          }}
        >
          Manage All
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* PDF Data Card */}
        <Card className={property.dataSources.pdf ? 'border-green-200' : 'border-gray-200'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <CardTitle className="text-base">PDF Report</CardTitle>
              </div>
              {property.dataSources.pdf ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {property.dataSources.pdf ? (
              <div className="space-y-3">
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Period</p>
                  <p className="font-medium">{property.dataSources.pdf.period}</p>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Revenue</p>
                  <p className="font-medium">
                    {formatCurrency(property.dataSources.pdf.data.totalNetEarnings || 0)}
                  </p>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Uploaded</p>
                  <p className="text-xs">{formatDate(property.dataSources.pdf.uploadedAt)}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={onUploadPdf}>
                    <Upload className="w-3 h-3 mr-1" />
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Upload your Airbnb earnings PDF for revenue data
                </p>
                <Button size="sm" className="w-full" onClick={onUploadPdf}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* CSV Data Card */}
        <Card className={property.dataSources.csv ? 'border-green-200' : 'border-gray-200'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-gray-600" />
                <CardTitle className="text-base">Transaction CSV</CardTitle>
              </div>
              {property.dataSources.csv ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {property.dataSources.csv ? (
              <div className="space-y-3">
                {property.metrics?.revenue?.source === 'csv' && (
                  <Badge className="bg-green-100 text-green-800 text-xs">Primary Data Source</Badge>
                )}
                
                {/* Transaction Counts with Deduplication Info */}
                {periodMetrics && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-1">
                      <p className="text-gray-500">Transactions</p>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                          Some bookings have multiple transactions (same confirmation code). 
                          We deduplicate these to show accurate metrics.
                        </div>
                      </div>
                    </div>
                    {selectedPeriod === 'allTime' ? (
                      <p className="text-xs">
                        <span className="font-medium">{periodMetrics.totalTransactionCount} total</span>
                        <span className="text-gray-500"> → </span>
                        <span className="font-medium text-green-600">{periodMetrics.allTimeStats.uniqueBookingCount} unique bookings</span>
                      </p>
                    ) : (
                      <p className="text-xs">
                        <span className="font-medium">{periodMetrics.periodTransactionCount} in period</span>
                        <span className="text-gray-500"> → </span>
                        <span className="font-medium text-green-600">{periodMetrics.periodStats.uniqueBookingCount} unique bookings</span>
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Date Range</p>
                  <p className="text-xs">
                    {property.dataSources.csv.dateRange?.start && property.dataSources.csv.dateRange?.end
                      ? `${new Date(property.dataSources.csv.dateRange.start).toLocaleDateString()} - ${new Date(property.dataSources.csv.dateRange.end).toLocaleDateString()}`
                      : 'Full year data'}
                  </p>
                </div>
                
                {/* Period-specific Metrics */}
                {periodMetrics && (
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-500">
                      {selectedPeriod === 'allTime' ? 'All Time' : 
                       selectedPeriod === 'yearToDate' ? 'Year to Date' : 
                       'Last 12 Months'} Metrics
                    </p>
                    <p className="text-xs font-medium">
                      Revenue: {formatCurrency(periodMetrics.metrics.revenue.value)} | 
                      Occupancy: {periodMetrics.metrics.occupancy?.value?.toFixed(1)}% |
                      Avg Rate: ${periodMetrics.metrics.pricing?.value?.toFixed(0)}/night
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={onUploadCsv}>
                    <Upload className="w-3 h-3 mr-1" />
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge className="bg-green-100 text-green-800 text-xs">Metrics Available</Badge>
                <p className="text-sm text-gray-500">
                  CSV data with revenue and occupancy metrics was uploaded with your initial data import.
                </p>
                <p className="text-xs text-gray-400">
                  All 11 properties have complete transaction data
                </p>
                <Button size="sm" className="w-full" variant="outline" onClick={onUploadCsv}>
                  <Upload className="w-4 h-4 mr-2" />
                  Update CSV Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Live Data Card */}
        <Card className={property.dataSources.scraped ? 'border-green-200' : property.airbnbUrl ? 'border-yellow-200' : 'border-gray-200'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <CardTitle className="text-base">Live Airbnb Data</CardTitle>
              </div>
              {property.dataSources.scraped ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : property.airbnbUrl ? (
                <Clock className="w-4 h-4 text-yellow-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {property.dataSources.scraped ? (
              <div className="space-y-3">
                {!process.env.BROWSERLESS_API_KEY && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">Mock Data</Badge>
                )}
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Current Price</p>
                  <p className="font-medium">
                    ${property.dataSources.scraped.data.price?.nightly || 'N/A'}/night
                  </p>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Reviews</p>
                  <p className="font-medium">
                    {property.dataSources.scraped.data.reviews?.overall || 'N/A'} ⭐ 
                    ({property.dataSources.scraped.data.reviews?.count || 0})
                  </p>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="text-gray-500">Last Synced</p>
                  <p className="text-xs">{formatDate(property.dataSources.scraped.scrapedAt)}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(property.airbnbUrl, '_blank')}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={onSync}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sync
                  </Button>
                </div>
              </div>
            ) : property.airbnbUrl ? (
              <div className="space-y-3">
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Ready to Sync</Badge>
                <p className="text-sm text-gray-500">
                  URL configured, sync to get live data
                </p>
                <Button size="sm" className="w-full" onClick={onSync}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="destructive" className="text-xs">Missing URL</Badge>
                <p className="text-sm text-gray-500">
                  Add Airbnb URL to enable live data sync
                </p>
                <Button size="sm" className="w-full" onClick={onAddUrl}>
                  <Globe className="w-4 h-4 mr-2" />
                  Add URL
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}