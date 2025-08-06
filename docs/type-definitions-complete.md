# Complete TypeScript Type Definitions

## Core Types (types/index.ts)

```typescript
// ============================================
// Property Types
// ============================================

export interface Property {
  id: string;
  propertyHash: string;
  name: string;
  status: 'active' | 'seasonal' | 'inactive' | 'expired';
  healthScore: number; // 0-100
  lastBookingDate: Date | null;
  monthsInactive: number;
  totalRevenue: number;
  avgMonthlyRevenue: number;
  nightsBooked: number;
  avgNightlyRate: number;
  occupancyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyWithAnalysis extends Property {
  analysis?: Analysis;
  enhancements?: Enhancement[];
  insights?: Insight[];
  recommendations?: Recommendation[];
}

export interface PropertySelection {
  property: Property;
  selected: boolean;
  price: number;
  tier: number;
  suggestedAction: 'analyze' | 'skip' | 'archive';
}

// ============================================
// Session Types
// ============================================

export interface AnalyticsSession {
  id: string;
  userId: string;
  propertiesFound: number;
  propertiesSelected: number;
  dataCompleteness: number;
  totalCost: number;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface SessionWithProperties extends AnalyticsSession {
  properties: Property[];
  selectedProperties: Set<string>;
  enhancements: Enhancement[];
  pricing: PricingDetails;
}

// ============================================
// Parsing Types
// ============================================

export interface ParsedData {
  properties: ParsedProperty[];
  summary?: Summary;
  transactions?: Transaction[];
  errors?: ParseError[];
  raw?: string;
}

export interface ParsedProperty {
  name: string;
  revenue: number;
  nightsBooked: number;
  avgStayLength?: number;
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export interface Transaction {
  confirmationCode: string;
  listingName: string;
  guestName: string; // Will be hashed
  startDate: Date;
  endDate: Date;
  nights: number;
  amount: number;
  fees: {
    service: number;
    cleaning: number;
    pet?: number;
    extra?: number;
  };
  status: 'completed' | 'cancelled' | 'altered';
}

export interface ParseError {
  file: string;
  line?: number;
  message: string;
  recoverable: boolean;
}

// ============================================
// Enhancement Types
// ============================================

export interface Enhancement {
  id: string;
  propertyId: string;
  sessionId: string;
  type: EnhancementType;
  dataProvided: any;
  qualityBefore: number;
  qualityAfter: number;
  aiResponse?: string;
  createdAt: Date;
}

export type EnhancementType = 
  | 'listing_url' 
  | 'calendar' 
  | 'reviews' 
  | 'competitors' 
  | 'expenses' 
  | 'photos';

export interface EnhancementRequest {
  type: EnhancementType;
  priority: 'critical' | 'important' | 'nice_to_have';
  reason: string;
  potentialImpact: string;
  howToGet: string;
}

export interface DataGaps {
  propertyId: string;
  propertyName: string;
  gaps: EnhancementRequest[];
  completeness: number; // 0-100
}

// ============================================
// Pricing Types
// ============================================

export interface PricingDetails {
  breakdown: PriceTier[];
  total: number;
  perProperty: number;
  suggestUnlimited: boolean;
  unlimitedPrice: number;
  savings: number;
  isMonthly: boolean;
}

export interface PriceTier {
  min: number;
  max: number;
  price: number;
  count: number;
  subtotal: number;
  label: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  propertyCount: number;
  properties: string[];
  basePrice: number;
  discount: number;
  finalPrice: number;
  badge?: string;
  features: string[];
  projectedValue: number;
}

// ============================================
// Analysis Types
// ============================================

export interface Analysis {
  id: string;
  propertyId: string;
  sessionId: string;
  metrics: Metrics;
  insights: Insight[];
  recommendations: Recommendation[];
  opportunities: Opportunity[];
  alerts: Alert[];
  confidence: number; // 0-100
  dataCompleteness: number; // 0-100
  createdAt: Date;
}

export interface Metrics {
  // Financial
  grossRevenue: number;
  netRevenue: number;
  avgNightlyRate: number;
  revPAN: number; // Revenue per available night
  
  // Operational
  occupancyRate: number;
  avgStayLength: number;
  bookingLeadTime: number;
  cancellationRate: number;
  
  // Quality
  reviewScore: number;
  responseRate: number;
  responseTime: number; // in hours
  
  // Comparative
  momGrowth?: number; // Month over month
  yoyGrowth?: number; // Year over year
  marketPosition?: number; // Percentile
}

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  category: 'revenue' | 'occupancy' | 'quality' | 'competitive';
  title: string;
  description: string;
  evidence?: string;
  confidence: number;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedValue?: number;
  timeframe?: string;
}

export interface Opportunity {
  action: string;
  impact: number;
  unit: string;
  effort: 'low' | 'medium' | 'high';
  propertyId?: string;
}

export interface Alert {
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  action?: string;
}

// ============================================
// AI Types
// ============================================

export interface AIRequest {
  propertyData: Property;
  enhancements?: Enhancement[];
  historicalData?: Metrics[];
  competitorData?: CompetitorData[];
  promptType: 'basic' | 'enhanced' | 'portfolio' | 'predictive';
}

export interface AIResponse {
  insights: string[];
  opportunities: Opportunity[];
  alerts: string[];
  recommendations: Recommendation[];
  confidence: number;
  rawResponse?: string;
}

export interface AIPersonality {
  name: string;
  style: 'friendly' | 'professional' | 'casual';
  emoji: string;
  greetings: string[];
  responses: Record<string, string[]>;
}

// ============================================
// Listing/Scraping Types
// ============================================

export interface ListingData {
  url: string;
  title: string;
  price: {
    nightly: number;
    currency: string;
    cleaningFee?: number;
  };
  rating: {
    overall: number;
    accuracy: number;
    cleanliness: number;
    checkin: number;
    communication: number;
    location: number;
    value: number;
  };
  reviews: {
    count: number;
    recent: Review[];
  };
  amenities: string[];
  photos: {
    count: number;
    urls: string[];
  };
  host: {
    name: string;
    isSuperhost: boolean;
    responseRate: number;
    responseTime: string;
    memberSince: Date;
  };
  location: {
    neighborhood: string;
    city: string;
    state: string;
    country: string;
  };
  availability: {
    minimumStay: number;
    maximumStay: number;
    instantBook: boolean;
  };
  scrapedAt: Date;
}

export interface CompetitorData extends ListingData {
  distanceFromProperty: number; // in miles
  priceDifference: number; // percentage
  amenityOverlap: number; // percentage
  isDirectCompetitor: boolean;
}

export interface Review {
  id: string;
  author: string;
  date: Date;
  rating: number;
  comment: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// ============================================
// Report Types
// ============================================

export interface Report {
  id: string;
  propertyId: string;
  sessionId: string;
  type: 'pdf' | 'excel' | 'json' | 'infographic';
  status: 'generating' | 'ready' | 'failed';
  url?: string;
  expiresAt?: Date;
  metadata: {
    pages?: number;
    fileSize?: number;
    generatedAt: Date;
  };
}

export interface PortfolioReport {
  userId: string;
  properties: PropertyWithAnalysis[];
  summary: {
    totalRevenue: number;
    avgOccupancy: number;
    avgHealthScore: number;
    topPerformers: Property[];
    needsAttention: Property[];
  };
  insights: {
    portfolio: Insight[];
    crossProperty: Insight[];
    marketTrends: Insight[];
  };
  recommendations: {
    immediate: Recommendation[];
    strategic: Recommendation[];
  };
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardData {
  user: User;
  properties: PropertyWithAnalysis[];
  recentAnalyses: Analysis[];
  subscription?: Subscription;
  metrics: {
    totalProperties: number;
    activeProperties: number;
    portfolioRevenue: number;
    avgHealthScore: number;
    lastAnalysis: Date;
  };
  notifications: Notification[];
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    tension?: number;
  }[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: Date;
}

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  subscription?: Subscription;
  credits: number;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  monthlyReports: boolean;
  alertThresholds: {
    occupancyDrop: number;
    revenueDrop: number;
    ratingDrop: number;
  };
  defaultCurrency: string;
  timezone: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: 'starter' | 'growth' | 'professional' | 'enterprise';
  status: 'active' | 'paused' | 'cancelled' | 'past_due';
  propertyCount: number;
  propertyIds: string[];
  monthlyPrice: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
}

// ============================================
// API Types
// ============================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Form Types
// ============================================

export interface UploadFormData {
  files: File[];
  sessionId?: string;
  autoDetect: boolean;
}

export interface PropertySelectionForm {
  properties: string[];
  analysisType: 'one_time' | 'monthly';
  enhancementRequests: EnhancementRequest[];
}

export interface PaymentFormData {
  sessionId: string;
  propertyIds: string[];
  pricing: PricingDetails;
  paymentMethod: 'card' | 'bank';
  subscriptionType?: 'monthly' | 'annual';
}

// ============================================
// State Management Types
// ============================================

export interface UploadState {
  files: File[];
  uploading: boolean;
  parsing: boolean;
  progress: number;
  errors: ParseError[];
  session?: AnalyticsSession;
  properties: Property[];
  selectedProperties: Set<string>;
}

export interface AnalysisState {
  analyzing: boolean;
  currentProperty?: string;
  completedProperties: string[];
  analyses: Map<string, Analysis>;
  reports: Map<string, Report>;
  portfolio?: PortfolioReport;
}

export interface EnhancementState {
  currentProperty?: Property;
  dataGaps: DataGaps[];
  enhancements: Enhancement[];
  quality: number;
  aiResponses: string[];
  isThinking: boolean;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncState<T> = {
  data?: T;
  loading: boolean;
  error?: Error;
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// ============================================
// Constants
// ============================================

export const PROPERTY_STATUS = {
  ACTIVE: 'active',
  SEASONAL: 'seasonal',
  INACTIVE: 'inactive',
  EXPIRED: 'expired'
} as const;

export const ENHANCEMENT_PRIORITY = {
  CRITICAL: 'critical',
  IMPORTANT: 'important',
  NICE_TO_HAVE: 'nice_to_have'
} as const;

export const ANALYSIS_DEPTH = {
  BASIC: 'basic',
  ENHANCED: 'enhanced',
  COMPLETE: 'complete',
  PREMIUM: 'premium'
} as const;
```