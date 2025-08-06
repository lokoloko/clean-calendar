'use client'

import { useState } from 'react'
import { DropZone } from '@/components/DropZone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, TableIcon, ChevronRight, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<{
    pdf?: File
    csv?: File
  }>({})
  const [uploadStatus, setUploadStatus] = useState<{
    pdf: 'idle' | 'uploading' | 'success' | 'error'
    csv: 'idle' | 'uploading' | 'success' | 'error'
  }>({
    pdf: 'idle',
    csv: 'idle'
  })

  const handlePDFUpload = async (file: File) => {
    setUploadStatus(prev => ({ ...prev, pdf: 'uploading' }))
    setUploadedFiles(prev => ({ ...prev, pdf: file }))
    
    // Simulate upload delay
    setTimeout(() => {
      setUploadStatus(prev => ({ ...prev, pdf: 'success' }))
    }, 1500)
  }

  const handleCSVUpload = async (file: File) => {
    setUploadStatus(prev => ({ ...prev, csv: 'uploading' }))
    setUploadedFiles(prev => ({ ...prev, csv: file }))
    
    // Simulate upload delay
    setTimeout(() => {
      setUploadStatus(prev => ({ ...prev, csv: 'success' }))
    }, 1500)
  }

  const handleProcessFiles = async () => {
    // TODO: Process files and navigate to property mapping
    router.push('/dashboard')
  }

  const hasFiles = uploadedFiles.pdf || uploadedFiles.csv

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto p-6 pt-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Airbnb Analytics Platform
          </h1>
          <p className="text-lg text-gray-600">
            Upload your Airbnb reports to analyze your portfolio performance
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Monthly Reports</CardTitle>
            <CardDescription>
              Upload your monthly earnings PDF and transaction CSV from Airbnb
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DropZone
                title="Earnings Report (PDF)"
                accept=".pdf"
                icon={<FileText className="w-8 h-8" />}
                onUpload={handlePDFUpload}
                status={uploadStatus.pdf}
                hint="e.g., 12_01_2024-12_31_2024_airbnb_earnings.pdf"
              />
              
              <DropZone
                title="Transaction History (CSV)"
                accept=".csv"
                icon={<TableIcon className="w-8 h-8" />}
                onUpload={handleCSVUpload}
                status={uploadStatus.csv}
                hint="e.g., airbnb_transactions.csv"
              />
            </div>

            {/* File List */}
            {hasFiles && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Uploaded Files:</h3>
                <ul className="space-y-1">
                  {uploadedFiles.pdf && (
                    <li className="text-sm text-gray-600">
                      📄 {uploadedFiles.pdf.name} ({(uploadedFiles.pdf.size / 1024).toFixed(1)} KB)
                    </li>
                  )}
                  {uploadedFiles.csv && (
                    <li className="text-sm text-gray-600">
                      📊 {uploadedFiles.csv.name} ({(uploadedFiles.csv.size / 1024).toFixed(1)} KB)
                    </li>
                  )}
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
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">21 Properties</p>
                  <p className="text-sm text-gray-500">Portfolio tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">AI Analysis</p>
                  <p className="text-sm text-gray-500">Powered by Gemini</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChevronRight className="w-5 h-5 text-purple-600" />
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
    </div>
  )
}