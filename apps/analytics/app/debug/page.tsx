'use client'

import { useEffect, useState } from 'react'
import { PropertyStore } from '@/lib/storage/property-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<any>(null)
  const [showAllCSV, setShowAllCSV] = useState(false)
  
  const loadProperties = () => {
    const props = PropertyStore.getAll()
    setProperties(props)
    
    // Find Monrovia Charm
    const monrovia = props.find(p => 
      p.name?.toLowerCase().includes('monrovia') && 
      p.name?.toLowerCase().includes('charm')
    )
    if (monrovia) {
      setSelectedProperty(monrovia)
    }
  }
  
  useEffect(() => {
    loadProperties()
  }, [])
  
  const recalculateMetrics = () => {
    // Get all properties and force recalculation
    const props = PropertyStore.getAll()
    let updated = 0
    
    props.forEach(prop => {
      // Recalculate metrics using the public method
      const newMetrics = PropertyStore.calculateMetrics(prop)
      prop.metrics = newMetrics
      
      // Save the updated property
      PropertyStore.save(prop)
      updated++
      
      console.log(`Recalculated metrics for ${prop.name || prop.standardName}:`, {
        revenue: newMetrics.revenue.value,
        occupancy: newMetrics.occupancy.value,
        pricing: newMetrics.pricing.value
      })
    })
    
    alert(`Recalculated metrics for ${updated} properties. Check console for details.`)
    loadProperties()
  }
  
  const monroviaMetrics = selectedProperty?.dataSources?.csv?.propertyMetrics?.find(
    (m: any) => m.name?.toLowerCase().includes('monrovia') && m.name?.toLowerCase().includes('charm')
  )
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Debug: Property Data Inspector</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAllCSV(!showAllCSV)} variant="outline">
            {showAllCSV ? 'Hide' : 'Show'} All CSV Metrics
          </Button>
          <Button onClick={recalculateMetrics} variant="outline">
            Recalculate All Metrics
          </Button>
        </div>
      </div>
      
      {showAllCSV && selectedProperty?.dataSources?.csv?.propertyMetrics && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>All CSV Metrics Available ({selectedProperty.dataSources.csv.propertyMetrics.length} properties)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {selectedProperty.dataSources.csv.propertyMetrics.map((metric: any, idx: number) => (
                <div key={idx} className="p-2 border rounded text-xs font-mono">
                  <p><strong>{metric.name}</strong></p>
                  <p>Revenue: ${metric.totalRevenue?.toFixed(2)} | Nights: {metric.totalNights} | Rate: ${metric.avgNightlyRate?.toFixed(2)}/night</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedProperty && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{selectedProperty.name || selectedProperty.standardName} - CSV Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <p><strong>Property Name:</strong> {selectedProperty.name}</p>
              <p><strong>Standard Name:</strong> {selectedProperty.standardName}</p>
              
              {monroviaMetrics && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                  <p className="font-bold mb-2">CSV Metrics for this property:</p>
                  <p><strong>CSV Name:</strong> {monroviaMetrics.name}</p>
                  <p><strong>Total Revenue:</strong> ${monroviaMetrics.totalRevenue?.toFixed(2)}</p>
                  <p><strong>Total Nights:</strong> {monroviaMetrics.totalNights}</p>
                  <p><strong>Booking Count:</strong> {monroviaMetrics.bookingCount}</p>
                  <p><strong>Avg Stay Length:</strong> {monroviaMetrics.avgStayLength?.toFixed(1)} nights</p>
                  <p><strong>Avg Nightly Rate:</strong> ${monroviaMetrics.avgNightlyRate?.toFixed(2)}/night</p>
                  
                  <div className="mt-4 p-2 bg-yellow-100 rounded">
                    <p className="font-bold">Calculation Check:</p>
                    <p>Revenue / Nights = ${monroviaMetrics.totalRevenue} / {monroviaMetrics.totalNights} = ${(monroviaMetrics.totalRevenue / monroviaMetrics.totalNights).toFixed(2)}/night</p>
                    <p>Stored Avg Rate: ${monroviaMetrics.avgNightlyRate?.toFixed(2)}/night</p>
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-4 bg-blue-100 rounded">
                <p className="font-bold mb-2">Calculated Metrics:</p>
                <p><strong>Revenue:</strong> ${selectedProperty.metrics?.revenue?.value?.toFixed(2)} ({selectedProperty.metrics?.revenue?.source})</p>
                <p><strong>Occupancy:</strong> {selectedProperty.metrics?.occupancy?.value?.toFixed(1)}% ({selectedProperty.metrics?.occupancy?.source})</p>
                <p><strong>Pricing:</strong> ${selectedProperty.metrics?.pricing?.value?.toFixed(2)}/night ({selectedProperty.metrics?.pricing?.source})</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties.map((prop, idx) => (
              <div key={idx} className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                   onClick={() => setSelectedProperty(prop)}>
                <p className="font-medium">{prop.name || prop.standardName}</p>
                <p className="text-sm text-gray-600">
                  Revenue: ${prop.metrics?.revenue?.value?.toFixed(0) || 0} | 
                  Occupancy: {prop.metrics?.occupancy?.value?.toFixed(0) || 0}% |
                  Rate: ${prop.metrics?.pricing?.value?.toFixed(0) || 0}/night
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}