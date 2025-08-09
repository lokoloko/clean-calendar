'use client'

import { useState, useEffect } from 'react'
import { DropZone } from '@/components/DropZone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { InstructionsModal } from '@/components/InstructionsModal'
import { GoStudioMLogo } from '@/components/GoStudioMLogo'
import { FileTextIcon, TableIcon, ChevronRightIcon, HelpCircleIcon, BarChart3Icon, ArrowRight } from '@/components/Icons'
import { UrlInputSection } from '@/components/UrlInputSection'

export default function UploadPage() {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [showInstructions, setShowInstructions] = useState(false)
  const [propertyUrls, setPropertyUrls] = useState<string[]>([])
  const [hasExistingData, setHasExistingData] = useState(false)
  
  // Check if user has existing session data
  useEffect(() => {
    async function checkExistingData() {
      try {
        const response = await fetch('/api/properties', {
          credentials: 'same-origin'
        })
        if (response.ok) {
          const data = await response.json()
          setHasExistingData(data.properties && data.properties.length > 0)
        }
      } catch (e) {
        console.error('Error checking existing data:', e)
      }
    }
    checkExistingData()
  }, [])

  const handleFileUpload = async (files: File[]) => {
    setUploadStatus('uploading')
    setUploadedFiles(files)
    
    // Simulate upload delay
    setTimeout(() => {
      setUploadStatus('success')
    }, 1500)
  }

  const handleProcessFiles = async () => {
    if (uploadedFiles.length === 0) return
    
    try {
      // Process files on server
      const formData = new FormData()
      uploadedFiles.forEach(file => {
        if (file.type === 'application/pdf') {
          formData.append('pdf', file)
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          formData.append('csv', file)
        }
      })
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Add URLs to the data if provided
        const dataWithUrls = {
          ...result.data,
          propertyUrls: propertyUrls.filter(url => url && url.includes('airbnb.com/rooms/')),
          // Ensure CSV data is included if present
          csv: result.data.csv || null
        }
        
        // Skip mapping and save directly to session
        const properties = result.data.properties || []
        const dataSource = result.data.dataSource || 'pdf-only'
        
        // Prepare data for API (similar to what mapping page does)
        const dashboardData = {
          ...dataWithUrls,
          properties: properties.map((prop: any, index: number) => ({
            ...prop,
            selected: true,
            mapped: true,
            status: prop.netEarnings > 0 ? 'active' : 'inactive',
            airbnbUrl: propertyUrls[index] || ''
          })),
          totalRevenue: properties.reduce((sum: number, p: any) => sum + (p.netEarnings || 0), 0),
          activeProperties: properties.filter((p: any) => p.netEarnings > 0).length,
          inactiveProperties: properties.filter((p: any) => p.netEarnings === 0).length,
          totalProperties: properties.length,
          totalNights: properties.reduce((sum: number, p: any) => sum + (p.nightsBooked || 0), 0),
          dataSource,
          replace: true,
          // Include CSV data properly
          csv: result.data.csv || null
        }
        
        // Save properties to session
        const saveResponse = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(dashboardData)
        })
        
        if (saveResponse.ok) {
          const saveResult = await saveResponse.json()
          console.log(`Saved ${saveResult.count} properties to session`)
          
          // Clear sessionStorage since we've saved to server
          sessionStorage.removeItem('uploadData')
          
          // Navigate directly to properties
          router.push('/properties')
        } else {
          console.error('Failed to save properties')
          alert('Failed to save properties. Please try again.')
        }
      } else {
        console.error('Upload failed:', result.error)
        alert(`Upload failed: ${result.error}\n\nPlease check the console for more details.`)
      }
    } catch (error) {
      console.error('Error processing files:', error)
      alert('Failed to process files. Please check the console for details.')
    }
  }

  const hasFiles = uploadedFiles.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto p-6 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <GoStudioMLogo className="mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Smart Analytics
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered insights for your Airbnb portfolio
          </p>
          {hasExistingData && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/properties')}
            >
              View Existing Properties
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Airbnb Reports</CardTitle>
                <CardDescription>
                  Drop your monthly earnings PDF and/or transaction CSV files here
                </CardDescription>
              </div>
              <button
                onClick={() => setShowInstructions(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <HelpCircleIcon className="w-4 h-4" />
                How to download from Airbnb
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <DropZone
              title="Drop Your Airbnb Files Here"
              accept=".pdf,.csv"
              icon={<FileTextIcon className="w-8 h-8" />}
              onUpload={handleFileUpload}
              status={uploadStatus}
              hint="Accepts PDF earnings reports and CSV transaction files"
              multiple={true}
            />

            {/* File List */}
            {hasFiles && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Uploaded Files:</h3>
                <ul className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {file.type === 'application/pdf' ? '📄' : '📊'} {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Process Button */}
            {hasFiles && (
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleProcessFiles}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  Process Files
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optional URL Section */}
        <div className="mb-8">
          <UrlInputSection onUrlsChange={setPropertyUrls} />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Full Portfolio</p>
                  <p className="text-sm text-gray-500">All properties analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3Icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">AI Analysis</p>
                  <p className="text-sm text-gray-500">Powered by AI</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChevronRightIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Quick Processing</p>
                  <p className="text-sm text-gray-500">Results in seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instructions Modal */}
      <InstructionsModal 
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  )
}