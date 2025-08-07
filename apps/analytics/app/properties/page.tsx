'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { PropertyStore, type Property } from '@/lib/storage/property-store'
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
  Filter
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
        aVal = a.standardName.toLowerCase()
        bVal = b.standardName.toLowerCase()
        break
      case 'revenue':
        aVal = a.metrics?.revenue.value || 0
        bVal = b.metrics?.revenue.value || 0
        break
      case 'completeness':
        aVal = a.dataCompleteness
        bVal = b.dataCompleteness
        break
      case 'updated':
        aVal = a.updatedAt.getTime()
        bVal = b.updatedAt.getTime()
        break
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const getDataSourceIcons = (property: Property) => {
    return (
      <div className="flex items-center gap-1">
        {property.dataSources.pdf ? (
          <span title="PDF uploaded" className="text-green-600">✅</span>
        ) : (
          <span title="PDF missing" className="text-gray-400">⚠️</span>
        )}
        <FileText className={`w-4 h-4 ${property.dataSources.pdf ? 'text-green-600' : 'text-gray-400'}`} />
        
        {property.dataSources.csv ? (
          <span title="CSV uploaded" className="text-green-600">✅</span>
        ) : (
          <span title="CSV missing" className="text-gray-400">⚠️</span>
        )}
        <Table className={`w-4 h-4 ${property.dataSources.csv ? 'text-green-600' : 'text-gray-400'}`} />
        
        {property.airbnbUrl ? (
          <span title="URL configured" className="text-green-600">✅</span>
        ) : (
          <span title="URL missing" className="text-red-400">❌</span>
        )}
        <Link className={`w-4 h-4 ${property.airbnbUrl ? 'text-green-600' : 'text-gray-400'}`} />
        
        {property.dataSources.scraped ? (
          <span title="Live data synced" className="text-green-600">✅</span>
        ) : (
          <span title="Not synced" className="text-gray-400">❌</span>
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
                  className="text-blue-600 hover:underline font-medium"
                  onClick={() => onPropertyClick(property)}
                >
                  {property.standardName}
                </button>
              </td>
              <td className="px-4 py-3">
                {getDataSourceIcons(property)}
              </td>
              <td className="px-4 py-3">
                {property.metrics?.revenue.value ? (
                  <span className="font-medium">
                    {formatCurrency(property.metrics.revenue.value)}
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
                  
                  {property.dataCompleteness < 100 && (
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
                  )}
                  
                  {property.airbnbUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSync(property)}
                      title="Sync with Airbnb"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
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

  useEffect(() => {
    loadProperties()
    // Run auto-migration on page load
    DataMigration.runAutoMigration().then(() => {
      loadProperties() // Reload after migration
    })
  }, [])

  const loadProperties = () => {
    const allProperties = PropertyStore.getAll()
    setProperties(allProperties)
    setLoading(false)
  }

  const handlePropertyClick = (property: Property) => {
    router.push(`/property/${property.id}`)
  }

  const handlePropertyEdit = (property: Property) => {
    // TODO: Implement edit modal
    console.log('Edit property:', property)
  }

  const handlePropertyDelete = (property: Property) => {
    if (confirm(`Delete ${property.standardName}? This cannot be undone.`)) {
      PropertyStore.delete(property.id)
      loadProperties()
    }
  }

  const handleAddUrl = (property: Property) => {
    const url = prompt(`Enter Airbnb URL for ${property.standardName}:`)
    if (url) {
      PropertyStore.updateUrl(property.id, url)
      loadProperties()
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

  const handleExportAll = () => {
    const data = PropertyStore.exportAll()
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
    synced: properties.filter(p => p.dataSources.scraped).length
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
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GoStudioMLogo width={240} height={72} />
              <div className="border-l pl-4 ml-2">
                <h1 className="text-xl font-semibold text-gray-900">Properties Dashboard</h1>
                <p className="text-sm text-gray-500">Manage all your properties in one place</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
            onPropertyClick={handlePropertyClick}
            onPropertyEdit={handlePropertyEdit}
            onPropertyDelete={handlePropertyDelete}
            onAddUrl={handleAddUrl}
            onSync={handleSync}
            onUploadData={handleUploadData}
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