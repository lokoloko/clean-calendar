'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Property } from '@/lib/storage/property-store'
import type { PropertyInsights, ActionItem } from '../page'
import { 
  Sparkles,
  TrendingUp,
  Target,
  Brain,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react'

interface GeminiInsightsTabsProps {
  insights: PropertyInsights | null
  property: Property
  onRegenerateInsights: () => void
  isGenerating: boolean
}

export default function GeminiInsightsTabs({
  insights,
  property,
  onRegenerateInsights,
  isGenerating
}: GeminiInsightsTabsProps) {
  
  const getPriorityIcon = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'important':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'opportunity':
        return <Lightbulb className="w-4 h-4 text-green-600" />
    }
  }
  
  const getPriorityBadge = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'important':
        return <Badge className="bg-yellow-100 text-yellow-800">Important</Badge>
      case 'opportunity':
        return <Badge className="bg-green-100 text-green-800">Opportunity</Badge>
    }
  }
  
  const getEffortBadge = (effort: ActionItem['effort']) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-purple-100 text-purple-800',
      high: 'bg-orange-100 text-orange-800'
    }
    return <Badge className={colors[effort]}>{effort} effort</Badge>
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>Gemini AI Insights</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRegenerateInsights}
            disabled={isGenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Refresh'}
          </Button>
        </div>
        {insights && (
          <CardDescription>
            Last generated: {new Date(insights.lastGenerated).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        {!insights ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Generating insights...</p>
          </div>
        ) : (
          <Tabs defaultValue="actionable" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="actionable">
                <Target className="w-4 h-4 mr-2" />
                Actionable
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="predictions">
                <Brain className="w-4 h-4 mr-2" />
                Predictions
              </TabsTrigger>
              <TabsTrigger value="coaching">
                <Sparkles className="w-4 h-4 mr-2" />
                Coaching
              </TabsTrigger>
            </TabsList>
            
            {/* Actionable Items Tab */}
            <TabsContent value="actionable" className="space-y-4">
              {insights.actionable.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No actionable items at this time</p>
              ) : (
                <>
                  {/* Group by priority */}
                  {['critical', 'important', 'opportunity'].map((priority) => {
                    const items = insights.actionable.filter(item => item.priority === priority)
                    if (items.length === 0) return null
                    
                    return (
                      <div key={priority} className="space-y-3">
                        <h3 className="font-medium text-sm text-gray-600 uppercase tracking-wider">
                          {priority === 'critical' && '🔴 Critical Actions'}
                          {priority === 'important' && '🟡 Important Optimizations'}
                          {priority === 'opportunity' && '🟢 Growth Opportunities'}
                        </h3>
                        
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getPriorityIcon(item.priority)}
                                  <h4 className="font-semibold">{item.title}</h4>
                                  {item.automatable && (
                                    <Badge variant="outline" className="text-xs">
                                      <Zap className="w-3 h-3 mr-1" />
                                      Automatable
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600 font-medium">Impact: {item.impact}</span>
                                  </div>
                                  {getEffortBadge(item.effort)}
                                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                </div>
                              </div>
                              
                              <Button size="sm" variant="ghost">
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </>
              )}
            </TabsContent>
            
            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              {insights.analysis.map((analysis) => (
                <div key={analysis.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{analysis.title}</h4>
                    <div className="flex items-center gap-2">
                      {analysis.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {analysis.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />}
                      {analysis.trend === 'stable' && <span className="text-gray-600">—</span>}
                      <Badge variant="outline" className="text-xs">
                        {analysis.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  
                  <ul className="space-y-1">
                    {analysis.findings.map((finding, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </TabsContent>
            
            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-4">
              {insights.predictions.map((prediction) => (
                <div key={prediction.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{prediction.metric}</h4>
                      <p className="text-sm text-gray-500">{prediction.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {prediction.metric === 'Revenue' 
                          ? `$${prediction.value.toLocaleString()}`
                          : `${prediction.value.toFixed(1)}%`}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {prediction.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Key Factors:</p>
                    <div className="flex flex-wrap gap-1">
                      {prediction.factors.map((factor, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            {/* Coaching Tab */}
            <TabsContent value="coaching" className="space-y-4">
              {insights.coaching.map((tip) => (
                <div key={tip.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <Badge variant="outline" className="text-xs mb-2">{tip.category}</Badge>
                      <h4 className="font-semibold mb-1">{tip.tip}</h4>
                      <p className="text-sm text-gray-600 mb-3">{tip.context}</p>
                      
                      {tip.resources && tip.resources.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Resources:</p>
                          <div className="flex flex-wrap gap-1">
                            {tip.resources.map((resource, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {resource}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}