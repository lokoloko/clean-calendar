export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          user_id: string
          name: string
          ics_url: string
          cleaning_fee: number
          last_sync: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
  analytics: {
    Tables: {
      properties: {
        Row: {
          id: string
          user_id: string
          listing_id: string | null
          name: string
          standard_name: string | null
          airbnb_url: string | null
          data_completeness: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id?: string | null
          name: string
          standard_name?: string | null
          airbnb_url?: string | null
          data_completeness?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string | null
          name?: string
          standard_name?: string | null
          airbnb_url?: string | null
          data_completeness?: number
          created_at?: string
          updated_at?: string
        }
      }
      property_metrics: {
        Row: {
          id: string
          property_id: string
          period_start: string
          period_end: string
          revenue: number
          occupancy_rate: number
          avg_nightly_rate: number
          total_nights: number
          total_bookings: number
          avg_stay_length: number
          source: 'pdf' | 'csv' | 'scraped' | 'calculated'
          confidence: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          period_start: string
          period_end: string
          revenue?: number
          occupancy_rate?: number
          avg_nightly_rate?: number
          total_nights?: number
          total_bookings?: number
          avg_stay_length?: number
          source: 'pdf' | 'csv' | 'scraped' | 'calculated'
          confidence?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          period_start?: string
          period_end?: string
          revenue?: number
          occupancy_rate?: number
          avg_nightly_rate?: number
          total_nights?: number
          total_bookings?: number
          avg_stay_length?: number
          source?: 'pdf' | 'csv' | 'scraped' | 'calculated'
          confidence?: number
          created_at?: string
          updated_at?: string
        }
      }
      data_sources: {
        Row: {
          id: string
          property_id: string
          type: 'pdf' | 'csv' | 'scraped'
          data: any // JSONB
          file_name: string | null
          uploaded_at: string
          period_start: string | null
          period_end: string | null
        }
        Insert: {
          id?: string
          property_id: string
          type: 'pdf' | 'csv' | 'scraped'
          data: any
          file_name?: string | null
          uploaded_at?: string
          period_start?: string | null
          period_end?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          type?: 'pdf' | 'csv' | 'scraped'
          data?: any
          file_name?: string | null
          uploaded_at?: string
          period_start?: string | null
          period_end?: string | null
        }
      }
      insights: {
        Row: {
          id: string
          property_id: string
          type: 'actionable' | 'analysis' | 'prediction' | 'coaching' | null
          priority: 'critical' | 'important' | 'opportunity' | null
          category: string | null
          title: string
          description: string | null
          impact: string | null
          effort: 'low' | 'medium' | 'high' | null
          automatable: boolean
          status: 'pending' | 'implemented' | 'dismissed'
          created_at: string
          expires_at: string | null
        }
      }
      property_comparisons: {
        Row: {
          id: string
          user_id: string
          name: string | null
          property_ids: string[]
          comparison_data: any | null
          created_at: string
        }
      }
    }
    Views: {
      property_overview: {
        Row: {
          id: string
          name: string
          standard_name: string | null
          airbnb_url: string | null
          data_completeness: number
          user_id: string
          listing_id: string | null
          revenue: number | null
          occupancy_rate: number | null
          avg_nightly_rate: number | null
          total_nights: number | null
          total_bookings: number | null
          period_start: string | null
          period_end: string | null
          source: string | null
          confidence: number | null
        }
      }
    }
  }
}