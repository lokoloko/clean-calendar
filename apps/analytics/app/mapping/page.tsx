'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PropertyMapping {
  pdfName: string
  csvName?: string
  standardName: string
  revenue: number
  status: 'active' | 'inactive'
  mapped: boolean
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

  useEffect(() => {
    // Get data from sessionStorage (passed from upload page)
    const uploadData = sessionStorage.getItem('uploadData')
    if (uploadData) {
      const parsed = JSON.parse(uploadData)
      
      // Create property mappings from PDF data
      const mappings: PropertyMapping[] = parsed.properties.map((prop: any) => ({
        pdfName: prop.name,
        csvName: PROPERTY_MAPPINGS[prop.name] || '',
        standardName: prop.name,
        revenue: prop.netEarnings,
        status: prop.netEarnings > 0 ? 'active' : 'inactive',
        mapped: true // Auto-mapped since we know the mappings
      }))
      
      setProperties(mappings)
    }
    setLoading(false)
  }, [])

  const handleConfirm = () => {
    // Store confirmed mappings
    sessionStorage.setItem('propertyMappings', JSON.stringify(properties))
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading property data...</p>
      </div>
    )
  }

  const activeCount = properties.filter(p => p.status === 'active').length
  const inactiveCount = properties.filter(p => p.status === 'inactive').length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Mapping Confirmation</h1>
          <p className="text-gray-600">
            We've detected {properties.length} properties from your files. Please confirm the mappings below.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{properties.length}</div>
              <p className="text-sm text-gray-500">Total Properties</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
              <p className="text-sm text-gray-500">Active (with revenue)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{inactiveCount}</div>
              <p className="text-sm text-gray-500">Inactive (no revenue)</p>
            </CardContent>
          </Card>
        </div>

        {/* Property Mappings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Property Mappings</CardTitle>
            <CardDescription>
              These are the properties found in your PDF and their corresponding CSV names
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.map((property, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    property.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {property.mapped ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{property.pdfName}</p>
                      {property.csvName && (
                        <p className="text-sm text-gray-500">CSV: {property.csvName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${property.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
            onClick={handleConfirm}
            className="flex items-center gap-2"
          >
            Confirm & Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}