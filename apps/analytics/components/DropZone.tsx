'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface DropZoneProps {
  title: string
  accept: string
  icon?: React.ReactNode
  onUpload: (files: File[]) => void
  status?: 'idle' | 'uploading' | 'success' | 'error'
  hint?: string
  multiple?: boolean
}

export function DropZone({ 
  title, 
  accept, 
  icon = <Upload className="w-8 h-8" />, 
  onUpload, 
  status = 'idle',
  hint,
  multiple = false
}: DropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles)
    }
  }, [onUpload])

  const getAcceptObject = () => {
    const acceptObj: any = {}
    if (accept.includes('.pdf')) {
      acceptObj['application/pdf'] = ['.pdf']
    }
    if (accept.includes('.csv')) {
      acceptObj['text/csv'] = ['.csv']
    }
    return acceptObj
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptObject(),
    maxFiles: multiple ? undefined : 1,
    multiple
  })

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
        {
          'border-gray-300 hover:border-primary-400 bg-white': status === 'idle',
          'border-primary-400 bg-primary-50': isDragActive,
          'border-green-400 bg-green-50': status === 'success',
          'border-red-400 bg-red-50': status === 'error',
          'border-blue-400 bg-blue-50': status === 'uploading',
        }
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center space-y-3">
        {status === 'success' ? (
          <CheckCircle className="w-8 h-8 text-green-500" />
        ) : status === 'error' ? (
          <AlertCircle className="w-8 h-8 text-red-500" />
        ) : (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
        
        <div>
          <p className="font-semibold text-gray-700">{title}</p>
          {hint && (
            <p className="text-sm text-gray-500 mt-1">{hint}</p>
          )}
        </div>
        
        <p className="text-xs text-gray-400">
          {isDragActive
            ? 'Drop the file here'
            : status === 'uploading'
            ? 'Processing...'
            : status === 'success'
            ? 'File uploaded successfully'
            : status === 'error'
            ? 'Upload failed, try again'
            : 'Drag & drop or click to browse'}
        </p>
      </div>
    </div>
  )
}