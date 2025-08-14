'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link2, Plus, ExternalLink } from 'lucide-react'

interface PropertyUrl {
  propertyName: string
  airbnbUrl: string
  lastScraped?: Date
}

export function PropertyUrlManager({ properties }: { properties: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [editingProperty, setEditingProperty] = useState<string | null>(null)
  const [tempUrl, setTempUrl] = useState('')

  const handleSaveUrl = (propertyName: string) => {
    setUrls(prev => ({ ...prev, [propertyName]: tempUrl }))
    setEditingProperty(null)
    setTempUrl('')
    
    // In real app, would save to database
    localStorage.setItem(`airbnb_url_${propertyName}`, tempUrl)
  }

  const handleEdit = (propertyName: string) => {
    setEditingProperty(propertyName)
    setTempUrl(urls[propertyName] || '')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property URLs for Future Scraping</CardTitle>
        <CardDescription>
          Add Airbnb listing URLs to enable advanced features like competitor analysis and real-time pricing updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {properties.map(propertyName => (
            <div key={propertyName} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Link2 className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{propertyName}</span>
              </div>
              
              {editingProperty === propertyName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://www.airbnb.com/rooms/..."
                    className="px-3 py-1 border rounded-md text-sm w-64"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveUrl(propertyName)}
                    disabled={!tempUrl}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingProperty(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {urls[propertyName] ? (
                    <>
                      <a
                        href={urls[propertyName]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View Listing
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(propertyName)}
                      >
                        Edit
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(propertyName)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add URL
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-1">
            🔮 Coming Soon: BrowserQL Scraping
          </p>
          <p className="text-sm text-blue-700">
            Once URLs are added, we'll automatically scrape listing data monthly to track:
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>• Photo quality and count changes</li>
            <li>• Competitor pricing movements</li>
            <li>• Review trends and ratings</li>
            <li>• Amenity comparisons</li>
            <li>• Seasonal pricing patterns</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}