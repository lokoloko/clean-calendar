'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface UrlInputSectionProps {
  onUrlsChange?: (urls: string[]) => void
}

export function UrlInputSection({ onUrlsChange }: UrlInputSectionProps) {
  const [urls, setUrls] = useState<string[]>([''])
  const [showUrlSection, setShowUrlSection] = useState(false)
  
  const addUrlField = () => {
    const newUrls = [...urls, '']
    setUrls(newUrls)
    onUrlsChange?.(newUrls.filter(u => u))
  }
  
  const removeUrlField = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index)
    setUrls(newUrls.length === 0 ? [''] : newUrls)
    onUrlsChange?.(newUrls.filter(u => u))
  }
  
  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
    onUrlsChange?.(newUrls.filter(u => u))
  }
  
  const handleBulkPaste = () => {
    const pastedUrls = prompt('Paste Airbnb URLs (one per line):')
    if (pastedUrls) {
      const urlArray = pastedUrls
        .split('\n')
        .map(u => u.trim())
        .filter(u => u && u.includes('airbnb.com/rooms/'))
      if (urlArray.length > 0) {
        setUrls(urlArray)
        onUrlsChange?.(urlArray)
        setShowUrlSection(true)
      }
    }
  }
  
  const validUrlCount = urls.filter(u => u && u.includes('airbnb.com/rooms/')).length
  
  if (!showUrlSection) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <CardTitle className="text-lg">Optional: Add Airbnb URLs</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUrlSection(true)}
              className="bg-white"
            >
              Add URLs
            </Button>
          </div>
          <CardDescription>
            Enable live data sync and competitor analysis by adding your listing URLs
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <CardTitle className="text-lg">Airbnb Listing URLs</CardTitle>
            </div>
            <CardDescription>
              Add URLs to enable live pricing data and competitor analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {validUrlCount > 0 && (
              <span className="text-sm text-green-600 font-medium">
                {validUrlCount} valid URL{validUrlCount !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkPaste}
              title="Paste multiple URLs at once"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              Bulk Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Help text */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">How to find your Airbnb URL:</p>
              <ol className="mt-1 space-y-0.5">
                <li>1. Go to airbnb.com and view your listing</li>
                <li>2. Copy the full URL from the address bar</li>
                <li>3. It should look like: https://www.airbnb.com/rooms/12345678</li>
              </ol>
            </div>
          </div>
          
          {/* URL input fields */}
          <div className="space-y-2">
            {urls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder="https://www.airbnb.com/rooms/..."
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  className={`flex-1 ${
                    url && !url.includes('airbnb.com/rooms/') 
                      ? 'border-red-300 focus:border-red-500' 
                      : ''
                  }`}
                />
                {urls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUrlField(index)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {/* Add more button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addUrlField}
            className="w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            Add Another URL
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}