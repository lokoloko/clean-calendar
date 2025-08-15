'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { AuthHeader } from '@/components/AuthHeader'
import { type Property } from '@/lib/storage/property-store'
import PropertyStoreAPI from '@/lib/storage/property-store-api'
import { DataMigration } from '@/lib/storage/migrations'
import { DataSync } from '@/lib/utils/data-sync'
import { formatCurrency } from '@/lib/utils'
import {
  Search,
  Plus,
  FileText,
  Table,
  Link,
  Globe,
  Download,
  Upload,
  Trash2,
  Eye,
  Edit,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreVertical,
  Filter,
  ArrowRight
} from 'lucide-react'

interface PropertiesTableProps {
  properties: Property[]
  onPropertyClick: (property: Property) => void
  onPropertyEdit: (property: Property) => void
  onPropertyDelete: (property: Property) => void
  onAddUrl: (property: Property) => void
  onSync: (property: Property) => void
  onUploadData: (property: Property, type: 'pdf' | 'csv') => void
}

function PropertiesTable({
  properties,
  onPropertyClick,
  onPropertyEdit,
  onPropertyDelete,
  onAddUrl,
  onSync,
  onUploadData
}: PropertiesTableProps) {
  const [sortColumn, setSortColumn] = useState<'name' | 'revenue' | 'completeness' | 'updated'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set())

  const handleSort = (column: 'name' | 'revenue' | 'completeness' | 'updated') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(column === 'name' ? 'asc' : 'desc')
    }
  }

  const sortedProperties = [...properties].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortColumn) {
      case 'name':
        aVal = (a.standardName || a.name || '').toLowerCase()
        bVal = (b.standardName || b.name || '').toLowerCase()
        break
      case 'revenue':
        aVal = typeof a.metrics?.revenue?.value === 'number' 
          ? a.metrics.revenue.value 
          : a.metrics?.revenue?.value?.value || 0
        bVal = typeof b.metrics?.revenue?.value === 'number' 
          ? b.metrics.revenue.value 
          : b.metrics?.revenue?.value?.value || 0
        break
      case 'completeness':
        aVal = a.dataCompleteness || 0
        bVal = b.dataCompleteness || 0
        break
      case 'updated':
        aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        break
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const getDataSourceIcons = (property: Property) => {
    // CSV is the primary data source, PDF is optional/redundant when CSV exists
    const hasCSV = property.dataSources.csv
    const hasPDF = property.dataSources.pdf
    
    return (
      <div className="flex items-center gap-1">
        {/* CSV - Primary financial data source */}
        {hasCSV ? (
          <span title="CSV transactions (complete data)" className="text-green-600">✅</span>
        ) : (
          <span title="CSV missing - upload for complete data" className="text-orange-500">⚠️</span>
        )}
        <Table className={`w-4 h-4 ${hasCSV ? 'text-green-600' : 'text-orange-500'}`} />
        
        {/* PDF - Only show if no CSV (since it's redundant with CSV) */}
        {!hasCSV && (
          <>
            {hasPDF ? (
              <span title="PDF summary (basic data)" className="text-blue-600">✅</span>
            ) : (
              <span title="No financial data" className="text-gray-400">⚠️</span>
            )}
            <FileText className={`w-4 h-4 ${hasPDF ? 'text-blue-600' : 'text-gray-400'}`} />
          </>
        )}
        
        {/* URL - Enables syncing */}
        {property.airbnbUrl ? (
          <span title="URL configured" className="text-green-600">✅</span>
        ) : (
          <span title="URL missing - add for live sync" className="text-orange-500">⚠️</span>
        )}
        <Link className={`w-4 h-4 ${property.airbnbUrl ? 'text-green-600' : 'text-gray-400'}`} />
        
        {/* Live sync status */}
        {property.dataSources.scraped ? (
          <span title="Live data synced" className="text-green-600">✅</span>
        ) : (
          <span title="Not synced" className="text-gray-400">⭕</span>
        )}
        <Globe className={`w-4 h-4 ${property.dataSources.scraped ? 'text-green-600' : 'text-gray-400'}`} />
      </div>
    )
  }

  const getHealthBadge = (health: number) => {
    if (health >= 80) {
      return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    } else if (health >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
    } else if (health >= 40) {
      return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                className="rounded"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProperties(new Set(properties.map(p => p.id)))
                  } else {
                    setSelectedProperties(new Set())
                  }
                }}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <button
                className="flex items-center gap-1 font-medium hover:text-blue-600"
                onClick={() => handleSort('name')}
              >
                Property Name
                {sortColumn === 'name' && (
                  sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left">Data Sources</th>
            <th className="px-4 py-3 text-left">
              <button
                className="flex items-center gap-1 font-medium hover:text-blue-600"
                onClick={() => handleSort('revenue')}
              >
                Revenue
                {sortColumn === 'revenue' && (
                  sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left">Health</th>
            <th className="px-4 py-3 text-left">
              <button
                className="flex items-center gap-1 font-medium hover:text-blue-600"
                onClick={() => handleSort('completeness')}
              >
                Complete
                {sortColumn === 'completeness' && (
                  sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                className="flex items-center gap-1 font-medium hover:text-blue-600"
                onClick={() => handleSort('updated')}
              >
                Updated
                {sortColumn === 'updated' && (
                  sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedProperties.map((property) => (
            <tr key={property.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedProperties.has(property.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedProperties)
                    if (e.target.checked) {
                      newSet.add(property.id)
                    } else {
                      newSet.delete(property.id)
                    }
                    setSelectedProperties(newSet)
                  }}
                />
              </td>
              <td className="px-4 py-3">
                <button
                  className="text-blue-600 hover:underline font-medium text-left"
                  onClick={() => onPropertyClick(property)}
                >
                  {property.standardName || property.name || 'Unnamed Property'}
                </button>
              </td>
              <td className="px-4 py-3">
                {getDataSourceIcons(property)}
              </td>
              <td className="px-4 py-3">
                {property.metrics?.revenue?.value ? (
                  <span className="font-medium">
                    {formatCurrency(
                      typeof property.metrics.revenue.value === 'number' 
                        ? property.metrics.revenue.value 
                        : property.metrics.revenue.value?.value || 0
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-4 py-3">
                {property.metrics?.health ? getHealthBadge(property.metrics.health) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        property.dataCompleteness >= 80 ? 'bg-green-600' :
                        property.dataCompleteness >= 50 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${property.dataCompleteness}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{property.dataCompleteness}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(property.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPropertyClick(property)}
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  {property.dataCompleteness < 100 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!property.airbnbUrl) {
                          onAddUrl(property)
                        } else if (!property.dataSources.csv) {
                          onUploadData(property, 'csv')
                        } else if (!property.dataSources.pdf) {
                          onUploadData(property, 'pdf')
                        }
                      }}
                      title={
                        !property.airbnbUrl ? 'Add URL' :
                        !property.dataSources.csv ? 'Upload CSV' :
                        'Upload PDF'
                      }
                      className="text-orange-600 hover:text-orange-700"
                    >
                      {!property.airbnbUrl ? <Link className="w-4 h-4" /> :
                       !property.dataSources.csv ? <Table className="w-4 h-4" /> :
                       <FileText className="w-4 h-4" />}
                    </Button>
                  ) : (
                    <div className="w-9 h-9" /> 
                  )}
                  
                  {property.airbnbUrl ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSync(property)}
                      title="Sync with Airbnb"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="w-9 h-9" />
                  )}
                  
                  <div className="relative group">
                    <Button
                      size="sm"
                      variant="ghost"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => onPropertyEdit(property)}
                      >
                        Edit Property
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => onPropertyDelete(property)}
                      >
                        Delete Property
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all')
  const [syncing, setSyncing] = useState(false)
  const [csvDateRange, setCsvDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSessionData, setIsSessionData] = useState(false)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])
  
  // Re-check auth when returning from login
  useEffect(() => {
    const handleFocus = () => {
      checkAuthAndLoadData()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const checkAuthAndLoadData = async () => {
    console.log('🔍 checkAuthAndLoadData called')
    setLoading(true)
    
    // Check if user is authenticated
    try {
      console.log('📡 Checking authentication status...')
      const authResponse = await fetch('/api/auth/check', {
        credentials: 'same-origin'
      })
      const authData = await authResponse.json()
      console.log('✅ Auth check result:', authData)
      setIsAuthenticated(authData.authenticated)
      
      if (authData.authenticated) {
        console.log('🔐 User is authenticated')
        
        // First, check if we already have properties in the database
        console.log('📚 Checking existing properties in database...')
        const existingProperties = await PropertyStoreAPI.getAll()
        console.log('📊 Existing properties in DB:', existingProperties.length)
        
        // If authenticated and we have session data, check if we need to save it
        const sessionData = sessionStorage.getItem('processedData')
        console.log('📦 Session data exists?', !!sessionData)
        
        if (sessionData && existingProperties.length === 0) {
          // Only save session data if no properties exist in DB
          const data = JSON.parse(sessionData)
          console.log('💾 No existing properties found, saving session data to database', {
            propertyCount: data.properties?.length,
            totalRevenue: data.totalRevenue
          })
          const saveResponse = await fetch('/api/properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(data)
          })
          
          if (saveResponse.ok) {
            console.log('Session data saved to database successfully')
            // Clear session storage after saving
            sessionStorage.removeItem('processedData')
            // Clear the session data flag
            setIsSessionData(false)
          } else {
            console.error('Failed to save session data to database')
          }
        } else if (sessionData && existingProperties.length > 0) {
          console.log('⚠️ Properties already exist in database, clearing session data to avoid duplicates')
          sessionStorage.removeItem('processedData')
        }
        
        // Always load from database for authenticated users
        console.log('📚 Loading properties from database...')
        await loadPropertiesFromDB()
      } else {
        console.log('🚫 User is NOT authenticated')
        // Check for session data from upload
        const sessionData = sessionStorage.getItem('processedData')
        console.log('📦 Session data exists?', !!sessionData)
        if (sessionData) {
          console.log('📋 Loading properties from session storage')
          await loadPropertiesFromSession(sessionData)
        } else {
          // No data, show empty state
          setProperties([])
          setLoading(false)
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setLoading(false)
    }
  }
  
  const loadPropertiesFromDB = async () => {
    console.log('🗄️ loadPropertiesFromDB called')
    const allProperties = await PropertyStoreAPI.getAll()
    console.log('📊 Properties loaded from DB:', allProperties.length)
    setProperties(allProperties)
    setIsSessionData(false) // Explicitly set to false when loading from DB
    console.log('🏷️ isSessionData set to:', false)
    
    // Extract CSV date range from the first property with CSV data
    const propertyWithCSV = allProperties.find(p => p.dataSources?.csv?.dateRange)
    if (propertyWithCSV?.dataSources?.csv?.dateRange) {
      setCsvDateRange({
        start: propertyWithCSV.dataSources.csv.dateRange.start,
        end: propertyWithCSV.dataSources.csv.dateRange.end
      })
    }
    
    setLoading(false)
  }
  
  const loadPropertiesFromSession = async (sessionDataStr: string) => {
    console.log('💼 loadPropertiesFromSession called')
    try {
      const data = JSON.parse(sessionDataStr)
      console.log('📝 Session data parsed:', {
        propertyCount: data.properties?.length,
        hasCSV: !!data.csv,
        hasPDF: !!data.pdf
      })
      
      // Transform session data to Property format
      const sessionProperties = data.properties.map((prop: any) => ({
        id: prop.id || Math.random().toString(36).substr(2, 9),
        name: prop.name || prop.standardName || prop.pdfName || 'Unnamed Property',
        standardName: prop.standardName || prop.name || prop.pdfName || 'Unnamed Property',
        airbnbUrl: prop.airbnbUrl || '',
        metrics: {
          // Use the property-specific revenue, not the total
          revenue: { value: prop.revenue || prop.totalRevenue || prop.netEarnings || 0 },
          health: (() => {
            // Calculate health score based on multiple factors
            const revenue = prop.revenue || prop.totalRevenue || prop.netEarnings || 0
            const occupancy = prop.occupancyRate || (prop.nightsBooked ? (prop.nightsBooked / 365) * 100 : 0)
            const hasData = revenue > 0 || prop.nightsBooked > 0
            
            if (!hasData) return 0
            
            // Weight factors: revenue (30%), occupancy (40%), data quality (30%)
            let score = 0
            
            // Revenue component (0-30 points)
            if (revenue >= 100000) score += 30
            else if (revenue >= 50000) score += 20
            else if (revenue >= 25000) score += 10
            else if (revenue > 0) score += 5
            
            // Occupancy component (0-40 points)
            if (occupancy >= 80) score += 40
            else if (occupancy >= 60) score += 30
            else if (occupancy >= 40) score += 20
            else if (occupancy > 0) score += 10
            
            // Data quality component (0-30 points)
            if (prop.hasAccurateMetrics) score += 30
            else if (prop.nightsBooked > 0) score += 15
            
            return Math.min(100, score)
          })(),
          occupancy: { value: prop.occupancyRate || (prop.nightsBooked ? (prop.nightsBooked / 365) * 100 : 0) },
          pricing: { value: prop.avgNightlyRate || 0 }
        },
        dataSources: {
          pdf: !!data.pdf,
          csv: data.csv ? {
            dateRange: data.csv.dateRange,
            propertyMetrics: data.csv.propertyMetrics
          } : null,
          scraped: false
        },
        dataCompleteness: data.csv ? 100 : (data.pdf ? 50 : 0),
        updatedAt: new Date(),
        createdAt: new Date()
      }))
      
      setProperties(sessionProperties)
      setIsSessionData(true)
      console.log('🏷️ isSessionData set to:', true)
      console.log('📊 Session properties loaded:', sessionProperties.length)
      
      // Extract CSV date range
      if (data.csv?.dateRange) {
        setCsvDateRange({
          start: new Date(data.csv.dateRange.start),
          end: new Date(data.csv.dateRange.end)
        })
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading session data:', error)
      setProperties([])
      setLoading(false)
    }
  }
  
  const loadProperties = async () => {
    if (isAuthenticated) {
      await loadPropertiesFromDB()
    } else {
      await checkAuthAndLoadData()
    }
  }

  const handlePropertyClick = (property: Property) => {
    // Store the current property in sessionStorage for the detail page
    sessionStorage.setItem(`property-${property.id}`, JSON.stringify(property))
    router.push(`/property/${property.id}`)
  }

  const handlePropertyEdit = (property: Property) => {
    // TODO: Implement edit modal
    console.log('Edit property:', property)
  }

  const handlePropertyDelete = async (property: Property) => {
    if (confirm(`Delete ${property.standardName}? This cannot be undone.`)) {
      await PropertyStoreAPI.delete(property.id)
      await loadProperties()
    }
  }

  const handleAddUrl = async (property: Property) => {
    const url = prompt(`Enter Airbnb URL for ${property.standardName}:`)
    if (url) {
      await PropertyStoreAPI.updateUrl(property.id, url)
      await loadProperties()
    }
  }

  const handleSync = async (property: Property) => {
    setSyncing(true)
    const result = await DataSync.syncWithAirbnb(property.id)
    if (result.success) {
      loadProperties()
    } else {
      alert(`Sync failed: ${result.errors?.join(', ')}`)
    }
    setSyncing(false)
  }

  const handleUploadData = (property: Property, type: 'pdf' | 'csv') => {
    // TODO: Implement file upload modal
    console.log(`Upload ${type} for:`, property)
  }

  const handleExportAll = async () => {
    const properties = await PropertyStoreAPI.getAll()
    const data = JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      properties
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `properties_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleSyncAll = async () => {
    if (!confirm('Sync all properties with Airbnb URLs? This may take a few minutes.')) {
      return
    }
    
    setSyncing(true)
    const result = await DataSync.syncAllProperties()
    alert(`Sync complete: ${result.successful} successful, ${result.failed} failed`)
    loadProperties()
    setSyncing(false)
  }
  
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return
    }
    
    try {
      // Call the clear API
      const response = await fetch('/api/clear-data', {
        method: 'POST',
        credentials: 'same-origin'
      })
      
      if (response.ok) {
        // Clear sessionStorage as well
        sessionStorage.clear()
        
        // Redirect to home page
        router.push('/')
      } else {
        alert('Failed to clear data. Please try again.')
      }
    } catch (error) {
      console.error('Error clearing data:', error)
      alert('Failed to clear data. Please try again.')
    }
  }

  // Filter properties
  let filteredProperties = properties
  
  if (searchTerm) {
    filteredProperties = filteredProperties.filter(p =>
      p.standardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }
  
  if (filterComplete === 'complete') {
    filteredProperties = filteredProperties.filter(p => p.dataCompleteness === 100)
  } else if (filterComplete === 'incomplete') {
    filteredProperties = filteredProperties.filter(p => p.dataCompleteness < 100)
  }

  // Calculate stats
  const stats = {
    total: properties.length,
    complete: properties.filter(p => p.dataCompleteness === 100).length,
    incomplete: properties.filter(p => p.dataCompleteness < 100).length,
    withUrls: properties.filter(p => p.airbnbUrl).length,
    synced: properties.filter(p => p.dataSources.scraped).length,
    totalRevenue: properties.reduce((sum, p) => {
      const value = p.metrics?.revenue?.value
      if (typeof value === 'number') return sum + value
      if (value && typeof value === 'object' && 'value' in value) return sum + (value.value || 0)
      return sum
    }, 0),
    totalNights: properties.reduce((sum, p) => {
      // Try to get nights from CSV metrics
      if (p.dataSources?.csv?.propertyMetrics && p.dataSources.csv.propertyMetrics.length > 0) {
        // Sum all nights from all propertyMetrics entries
        const propertyNights = p.dataSources.csv.propertyMetrics.reduce(
          (nights, metric) => nights + (metric.totalNights || 0), 
          0
        )
        return sum + propertyNights
      }
      return sum
    }, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading properties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      
      {/* Header */}
      {/* Login Prompt for Session Data */}
      {!isAuthenticated && isSessionData && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Your data is ready!</span> Login to save your properties permanently and access advanced features.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/login?from=/properties')}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Login to Save
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Properties Dashboard</h1>
              <p className="text-sm text-gray-500">
                {csvDateRange.start && csvDateRange.end ? (
                  <>
                    Data from {new Date(csvDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {new Date(csvDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </>
                ) : isSessionData ? (
                  'Preview mode - Login to save'
                ) : (
                  'Manage all your properties in one place'
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Mark that we're appending data
                  sessionStorage.setItem('appendMode', 'true')
                  router.push('/')
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload More Data
              </Button>
              {isAuthenticated && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExportAll}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncing || stats.withUrls === 0}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync All
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                onClick={handleClearAll}
                title="Clear all data and start fresh"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Revenue Summary when CSV data is available */}
        {csvDateRange.start && stats.totalRevenue > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total Revenue: <span className="font-bold text-green-700">${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {stats.totalNights > 0 && (
                    <> • Total Nights: <span className="font-bold text-blue-700">{stats.totalNights.toLocaleString()}</span></>
                  )}
                  {stats.totalNights > 0 && (
                    <> • Avg Rate: <span className="font-bold text-purple-700">${(stats.totalRevenue / stats.totalNights).toFixed(2)}/night</span></>
                  )}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {csvDateRange.start && csvDateRange.end && (
                  <>
                    {((new Date(csvDateRange.end).getTime() - new Date(csvDateRange.start).getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)} years of data
                  </>
                )}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-gray-500">Total Properties</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
              <p className="text-sm text-gray-500">Complete</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{stats.incomplete}</div>
              <p className="text-sm text-gray-500">Actions Needed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.withUrls}</div>
              <p className="text-sm text-gray-500">With URLs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.synced}</div>
              <p className="text-sm text-gray-500">Synced</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search properties..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Button
              variant={filterComplete === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterComplete('all')}
            >
              All
            </Button>
            <Button
              variant={filterComplete === 'complete' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterComplete('complete')}
            >
              Complete
            </Button>
            <Button
              variant={filterComplete === 'incomplete' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterComplete('incomplete')}
            >
              Incomplete
            </Button>
          </div>
        </div>

        {/* Properties Table */}
        {filteredProperties.length > 0 ? (
          <PropertiesTable
            properties={filteredProperties}
            onPropertyClick={isAuthenticated ? handlePropertyClick : () => {
              alert('Please login to view detailed property analytics')
              router.push('/login?from=/properties')
            }}
            onPropertyEdit={isAuthenticated ? handlePropertyEdit : () => {}}
            onPropertyDelete={isAuthenticated ? handlePropertyDelete : () => {}}
            onAddUrl={isAuthenticated ? handleAddUrl : () => {}}
            onSync={isAuthenticated ? handleSync : () => {}}
            onUploadData={isAuthenticated ? handleUploadData : () => {}}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">
                {searchTerm || filterComplete !== 'all' 
                  ? 'No properties found matching your filters'
                  : 'No properties yet. Upload your Airbnb data to get started.'}
              </p>
              {!searchTerm && filterComplete === 'all' && (
                <Button
                  className="mt-4"
                  onClick={() => router.push('/')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Data
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}