'use client'

import { useState } from 'react'
import { Property } from '@/lib/storage/property-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Edit2, Check, X, Link, ExternalLink } from 'lucide-react'

interface PropertyHeaderProps {
  property: Property
  onEditName: (name: string) => void
  onEditUrl: () => void
}

export default function PropertyHeader({ property, onEditName, onEditUrl }: PropertyHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(property.standardName)
  
  const handleSaveName = () => {
    if (editedName.trim() && editedName !== property.standardName) {
      onEditName(editedName.trim())
    }
    setIsEditingName(false)
  }
  
  const handleCancelEdit = () => {
    setEditedName(property.standardName)
    setIsEditingName(false)
  }
  
  const getCompletnessBadge = () => {
    const { dataCompleteness } = property
    
    if (dataCompleteness === 100) {
      return <Badge className="bg-green-100 text-green-800">Complete</Badge>
    } else if (dataCompleteness >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">{dataCompleteness}% Complete</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">{dataCompleteness}% Complete</Badge>
    }
  }
  
  return (
    <div className="space-y-2">
      {/* Property Name */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-xl font-semibold w-96"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') handleCancelEdit()
              }}
            />
            <Button size="sm" variant="ghost" onClick={handleSaveName}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{property.standardName}</h1>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
              <Edit2 className="w-3 h-3" />
            </Button>
          </>
        )}
        
        {getCompletnessBadge()}
      </div>
      
      {/* Airbnb URL */}
      <div className="flex items-center gap-2 text-sm">
        {property.airbnbUrl ? (
          <>
            <Link className="w-4 h-4 text-gray-400" />
            <a
              href={property.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              View on Airbnb
              <ExternalLink className="w-3 h-3" />
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={onEditUrl}
            >
              Edit URL
            </Button>
          </>
        ) : (
          <>
            <span className="text-gray-500">No Airbnb URL</span>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onEditUrl}
            >
              Add URL
            </Button>
          </>
        )}
      </div>
      
      {/* Last Updated */}
      <div className="text-xs text-gray-500">
        Last updated: {new Date(property.updatedAt).toLocaleString()}
      </div>
    </div>
  )
}