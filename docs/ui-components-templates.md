# Ready-to-Use UI Component Templates

## 1. DropZone Component

```tsx
// components/upload/DropZone.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  acceptedFormats?: string[];
  maxSize?: number; // in MB
}

export function DropZone({ 
  onFilesSelected, 
  maxFiles = 10,
  acceptedFormats = ['.pdf', '.csv', '.ics'],
  maxSize = 10 
}: DropZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setErrors([]);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errorMessages = rejectedFiles.map(({ file, errors }) => {
        return errors.map((e: any) => e.message).join(', ');
      });
      setErrors(errorMessages);
    }

    // Add accepted files
    const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  }, [files, maxFiles, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'text/calendar': ['.ics']
    },
    maxFiles,
    maxSize: maxSize * 1024 * 1024
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
          files.length > 0 && "p-4"
        )}
      >
        <input {...getInputProps()} />
        
        {files.length === 0 ? (
          <div className="py-8">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Drop files here" : "Drag & drop your files here"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse from your computer
            </p>
            <p className="text-xs text-gray-400">
              Accepts: {acceptedFormats.join(', ')} • Max {maxSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-2">
              {isDragActive ? "Drop more files" : "Click or drag to add more files"}
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 2. PropertyCard Component

```tsx
// components/ui/PropertyCard.tsx
'use client';

import { Property } from '@/types';
import { Heart, TrendingUp, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  selected: boolean;
  onToggle: () => void;
  price?: number;
  badge?: string;
  dimmed?: boolean;
  showWarning?: string;
}

export function PropertyCard({
  property,
  selected,
  onToggle,
  price,
  badge,
  dimmed,
  showWarning
}: PropertyCardProps) {
  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      seasonal: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Seasonal' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive' },
      expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expired' }
    };
    return badges[status as keyof typeof badges];
  };

  const statusBadge = getStatusBadge(property.status);

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-all cursor-pointer",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300",
        dimmed && "opacity-60"
      )}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 line-clamp-1">
            {property.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("px-2 py-0.5 rounded-full text-xs", statusBadge.bg, statusBadge.text)}>
              {statusBadge.label}
            </span>
            {badge && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                {badge}
              </span>
            )}
          </div>
        </div>
        
        {/* Health Score */}
        <div className="flex items-center gap-1">
          <Heart className={cn("w-4 h-4", getHealthColor(property.healthScore))} />
          <span className={cn("text-sm font-medium", getHealthColor(property.healthScore))}>
            {property.healthScore}%
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Last booking</p>
            <p className="text-sm font-medium">
              {property.monthsInactive === 0 ? 'This month' :
               property.monthsInactive === 1 ? 'Last month' :
               `${property.monthsInactive} months ago`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Monthly avg</p>
            <p className="text-sm font-medium">
              ${property.avgMonthlyRevenue.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Occupancy</p>
            <p className="text-sm font-medium">{property.occupancyRate}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Total revenue</p>
            <p className="text-sm font-medium">
              ${property.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      {showWarning && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
          <AlertCircle className="w-3 h-3" />
          {showWarning}
        </div>
      )}

      {/* Selection indicator & price */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-primary rounded focus:ring-primary"
          />
          <span className="text-sm text-gray-600">
            {selected ? 'Selected for analysis' : 'Click to select'}
          </span>
        </div>
        
        {price !== undefined && (
          <span className="text-sm font-medium text-primary">
            {price === 0 ? 'FREE' : `$${price}`}
          </span>
        )}
      </div>
    </div>
  );
}
```

## 3. AI Assistant Component

```tsx
// components/enhance/AIAssistant.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bot, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  property: Property;
  gaps: DataGaps;
  onDataProvided: (type: string, data: any) => void;
}

export function AIAssistant({ property, gaps, onDataProvided }: AIAssistantProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [responses, setResponses] = useState<string[]>([]);

  const messages = {
    greeting: `Hi! I'm analyzing ${property.name} and I can help you get even better insights! 🎯`,
    critical: `First, I really need your listing URL to see what guests see. This unlocks pricing and quality analysis.`,
    good: `Great! Your listing looks good. I notice you have the Superhost badge - that's a huge advantage!`,
    complete: `Perfect! I have everything I need for a comprehensive analysis. Let's dive in! ✨`
  };

  useEffect(() => {
    // Simulate typing effect
    const message = gaps.completeness < 60 ? messages.critical : 
                   gaps.completeness < 100 ? messages.good : 
                   messages.complete;
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < message.length) {
        setCurrentMessage(message.substring(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [gaps.completeness]);

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6">
      {/* AI Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          {isTyping && (
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Analytics Assistant</h3>
          <p className="text-sm text-gray-600">
            I'll help you get the most comprehensive analysis
          </p>
        </div>
        
        {/* Quality Score */}
        <div className="text-right">
          <p className="text-xs text-gray-500">Analysis Quality</p>
          <p className="text-2xl font-bold text-primary">{gaps.completeness}%</p>
        </div>
      </div>

      {/* Message */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <p className="text-gray-700">
          {currentMessage}
          {isTyping && <span className="animate-pulse">|</span>}
        </p>
      </div>

      {/* Data Request Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {gaps.gaps.map((gap, index) => (
            <motion.div
              key={gap.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
            >
              <DataRequestCard
                gap={gap}
                onProvide={(data) => onDataProvided(gap.type, data)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Responses */}
      {responses.length > 0 && (
        <div className="mt-4 space-y-2">
          {responses.map((response, index) => (
            <div key={index} className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5" />
              <p className="text-sm text-gray-600">{response}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-component for data request cards
function DataRequestCard({ gap, onProvide }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      important: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      nice_to_have: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[priority as keyof typeof colors];
  };

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all",
      getPriorityColor(gap.priority),
      isExpanded && "ring-2 ring-offset-1"
    )}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{gap.type.replace('_', ' ')}</span>
          <span className="text-xs opacity-75">{gap.priority.replace('_', ' ')}</span>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform",
          isExpanded && "rotate-90"
        )} />
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">{gap.reason}</p>
          <p className="text-sm font-medium">{gap.potentialImpact}</p>
          
          {gap.type === 'listing_url' && (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://airbnb.com/rooms/..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={() => onProvide({ url: inputValue })}
                className="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 4. Pricing Calculator Component

```tsx
// components/ui/PricingCalculator.tsx
'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCalculatorProps {
  selectedCount: number;
  isNewUser: boolean;
  onPlanSelect?: (plan: any) => void;
}

export function PricingCalculator({ 
  selectedCount, 
  isNewUser,
  onPlanSelect 
}: PricingCalculatorProps) {
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [showUnlimited, setShowUnlimited] = useState(false);

  useEffect(() => {
    const tiers = [
      { min: 1, max: 1, price: isNewUser ? 0 : 3 },
      { min: 2, max: 5, price: 3 },
      { min: 6, max: 10, price: 2 },
      { min: 11, max: 20, price: 1.5 },
      { min: 21, max: Infinity, price: 1 }
    ];

    let remaining = selectedCount;
    let runningTotal = 0;
    const newBreakdown = [];

    for (const tier of tiers) {
      if (remaining <= 0) break;
      
      const countInTier = Math.min(
        remaining,
        tier.max - tier.min + 1
      );
      
      const tierTotal = countInTier * tier.price;
      runningTotal += tierTotal;
      
      newBreakdown.push({
        count: countInTier,
        price: tier.price,
        total: tierTotal,
        label: tier.min === 1 && isNewUser ? 'First property FREE!' : 
               `Properties ${tier.min}-${Math.min(tier.max, tier.min + countInTier - 1)}`
      });
      
      remaining -= countInTier;
    }

    setBreakdown(newBreakdown);
    setTotal(runningTotal);
    setShowUnlimited(runningTotal > 35);
  }, [selectedCount, isNewUser]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Investment</h3>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <span className="text-2xl font-bold text-primary">${total}</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 mb-4">
        {breakdown.map((tier, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{tier.label}</span>
            <span className="font-medium">
              {tier.price === 0 ? 'FREE' : `${tier.count} × $${tier.price} = $${tier.total}`}
            </span>
          </div>
        ))}
      </div>

      {/* Unlimited suggestion */}
      {showUnlimited && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-primary">Upgrade to Unlimited</p>
              <p className="text-sm text-gray-600 mt-1">
                Analyze unlimited properties for just $49/month
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You'd save ${total - 49} with {selectedCount} properties
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Value proposition */}
      <div className="border-t pt-4">
        <p className="text-xs text-gray-500 mb-2">What you get:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span>AI insights</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span>PDF reports</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span>Excel export</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span>Action plan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 5. Dashboard Metric Card

```tsx
// components/dashboard/MetricCard.tsx
'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'number'
}: MetricCardProps) {
  const formatValue = () => {
    if (format === 'currency') {
      return `$${Number(value).toLocaleString()}`;
    }
    if (format === 'percentage') {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    if (!change) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-gray-500';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatValue()}
          </p>
          
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 mt-2", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
```

## 6. Loading States

```tsx
// components/ui/LoadingStates.tsx
'use client';

export function PropertyCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="h-6 w-12 bg-gray-200 rounded" />
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
      
      <div className="h-10 bg-gray-200 rounded" />
    </div>
  );
}

export function AnalysisLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-gray-600 font-medium">Analyzing your properties...</p>
      <p className="text-sm text-gray-500 mt-1">This may take 30-60 seconds</p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="bg-white rounded-lg border p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

## 7. Portfolio Comparison Component

```tsx
// components/portfolio/ComparisonView.tsx
'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Star } from 'lucide-react';

interface ComparisonViewProps {
  properties: PropertyWithAnalysis[];
  onPropertySelect: (propertyId: string) => void;
}

export function ComparisonView({ properties, onPropertySelect }: ComparisonViewProps) {
  const [metric, setMetric] = useState<'revenue' | 'occupancy' | 'health'>('revenue');
  
  const chartData = properties.map(p => ({
    name: p.name.substring(0, 20),
    revenue: p.avgMonthlyRevenue,
    occupancy: p.occupancyRate,
    health: p.healthScore,
    potential: p.analysis?.opportunities.reduce((sum, o) => sum + o.impact, 0) || 0
  }));

  const getMetricLabel = () => {
    const labels = {
      revenue: 'Monthly Revenue ($)',
      occupancy: 'Occupancy Rate (%)',
      health: 'Health Score'
    };
    return labels[metric];
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Portfolio Comparison</h2>
        
        {/* Metric selector */}
        <div className="flex gap-2">
          {(['revenue', 'occupancy', 'health'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                metric === m 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={metric} fill="#FF5A5F" name="Current" />
            {metric === 'revenue' && (
              <Bar dataKey="potential" fill="#00A699" name="Potential" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Property cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {properties
          .sort((a, b) => b[metric === 'revenue' ? 'avgMonthlyRevenue' : metric === 'occupancy' ? 'occupancyRate' : 'healthScore'] - 
                         a[metric === 'revenue' ? 'avgMonthlyRevenue' : metric === 'occupancy' ? 'occupancyRate' : 'healthScore'])
          .slice(0, 3)
          .map((property, index) => (
            <div 
              key={property.id}
              className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => onPropertySelect(property.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {index === 0 && <Star className="w-4 h-4 text-yellow-500" />}
                  <span className="font-medium text-sm">#{index + 1}</span>
                </div>
                {property.healthScore < 50 && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              <h4 className="font-medium mb-2 line-clamp-1">{property.name}</h4>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Revenue</span>
                  <span className="font-medium">${property.avgMonthlyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Occupancy</span>
                  <span className="font-medium">{property.occupancyRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Health</span>
                  <span className="font-medium">{property.healthScore}%</span>
                </div>
              </div>
              
              {property.analysis?.recommendations[0] && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500">Top recommendation:</p>
                  <p className="text-xs font-medium text-primary mt-1">
                    {property.analysis.recommendations[0].action}
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
```

## 8. Monthly Upsell Component

```tsx
// components/upsell/MonthlyUpsell.tsx
'use client';

import { useState } from 'react';
import { Check, Clock, TrendingUp, Bell, FileText, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

interface MonthlyUpsellProps {
  properties: Property[];
  onSubscribe: (plan: any) => void;
  onDismiss: () => void;
}

export function MonthlyUpsell({ properties, onSubscribe, onDismiss }: MonthlyUpsellProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('active-only');
  
  const plans = [
    {
      id: 'active-only',
      name: 'Active Properties',
      properties: properties.filter(p => p.status === 'active'),
      price: properties.filter(p => p.status === 'active').length * 12,
      badge: 'RECOMMENDED',
      features: [
        'Monthly performance reports',
        'Email & SMS alerts',
        'Trend analysis',
        'AI-powered insights'
      ]
    },
    {
      id: 'all-properties',
      name: 'Complete Portfolio',
      properties: properties,
      price: Math.round(properties.length * 10 * 0.85), // 15% discount
      badge: 'BEST VALUE',
      features: [
        'Everything in Active',
        'API access',
        'White-label reports',
        'Priority support',
        'Custom alerts'
      ]
    }
  ];

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-8 rounded-t-2xl">
          <h2 className="text-3xl font-bold mb-2">
            Never Miss Another Opportunity
          </h2>
          <p className="text-lg opacity-90">
            Track your properties monthly and catch issues before they cost you money
          </p>
        </div>

        {/* What you're missing */}
        <div className="p-8 border-b">
          <h3 className="text-xl font-semibold mb-4">What You're Missing Without Monthly Tracking</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <TrendingUp className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">Revenue Drops</p>
                <p className="text-sm text-gray-600">
                  You won't know about declining bookings until it's too late
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Seasonal Patterns</p>
                <p className="text-sm text-gray-600">
                  Missing optimal pricing windows throughout the year
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Competitor Changes</p>
                <p className="text-sm text-gray-600">
                  New listings stealing your bookings without you knowing
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Performance Trends</p>
                <p className="text-sm text-gray-600">
                  Can't track if improvements are actually working
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing plans */}
        <div className="p-8">
          <h3 className="text-xl font-semibold mb-4">Choose Your Plan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={cn(
                  "border rounded-lg p-6 cursor-pointer transition-all",
                  selectedPlan === plan.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{plan.name}</h4>
                    <p className="text-sm text-gray-600">
                      {plan.properties.length} properties
                    </p>
                  </div>
                  {plan.badge && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                      {plan.badge}
                    </span>
                  )}
                </div>
                
                <p className="text-3xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-500">/month</span>
                </p>
                
                <div className="space-y-2">
                  {plan.features.map(feature => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between">
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-700"
            >
              Maybe later
            </button>
            
            <button
              onClick={() => onSubscribe(selectedPlanData)}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Monthly Monitoring - ${selectedPlanData?.price}/mo
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

## 9. Alert/Notification Component

```tsx
// components/ui/Alert.tsx
'use client';

import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ 
  type, 
  title, 
  message, 
  dismissible = false,
  onDismiss,
  className 
}: AlertProps) {
  const styles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5" />
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5" />
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertCircle className="w-5 h-5" />
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="w-5 h-5" />
    }
  };

  const style = styles[type];

  return (
    <div className={cn(
      "border rounded-lg p-4",
      style.bg,
      style.border,
      style.text,
      className
    )}>
      <div className="flex items-start">
        <div className="flex-shrink-0">{style.icon}</div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="ml-3 flex-shrink-0 hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```
      