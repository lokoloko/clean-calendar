'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Property } from '@/lib/storage/property-store'
import {
  Download,
  Share2,
  BarChart3,
  Calendar,
  Mail,
  Settings,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  Shield,
  HelpCircle
} from 'lucide-react'

interface ActionSidebarProps {
  property: Property
  onExport: () => void
  onShare: () => void
  onCompare: () => void
  onScheduleSync: () => void
  onEmailReport: () => void
}

export default function ActionSidebar({
  property,
  onExport,
  onShare,
  onCompare,
  onScheduleSync,
  onEmailReport
}: ActionSidebarProps) {
  
  return (
    <div className="space-y-4 sticky top-24">
      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onCompare}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Compare Properties
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onEmailReport}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Report
          </Button>
          
          {property.airbnbUrl && (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={onScheduleSync}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Sync
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Property Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Property Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Data Sources</span>
            <span className="font-medium">
              {[
                property.dataSources.pdf,
                property.dataSources.csv,
                property.dataSources.scraped
              ].filter(Boolean).length}/3
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Completeness</span>
            <span className="font-medium">{property.dataCompleteness}%</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Health Score</span>
            <span className="font-medium">{property.metrics?.health || 0}%</span>
          </div>
          
          {property.lastSyncedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last Synced</span>
              <span className="font-medium">
                {new Date(property.lastSyncedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Pro Tips */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            <CardTitle className="text-base">Pro Tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!property.dataSources.csv && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <strong>Add CSV data</strong> for accurate occupancy metrics and stay patterns
              </p>
            </div>
          )}
          
          {!property.airbnbUrl && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Add Airbnb URL</strong> to enable live pricing and competitor analysis
              </p>
            </div>
          )}
          
          {property.metrics?.occupancy.value < 70 && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-800">
                <strong>Low occupancy detected</strong> - Consider adjusting pricing or minimum stay
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Help & Support */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-gray-600" />
            <CardTitle className="text-base">Need Help?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="link" className="p-0 h-auto text-sm">
            View Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}