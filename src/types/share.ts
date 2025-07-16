export interface ShareToken {
  id: string
  user_id: string
  token: string
  name: string | null
  cleaner_id: string | null
  listing_ids: string[] | null
  date_from: string | null
  date_to: string | null
  expires_at: string
  view_count: number
  last_viewed_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateShareRequest {
  name?: string
  cleanerId?: string
  listingIds?: string[]
  dateFrom?: string
  dateTo?: string
  expiresInDays?: number
}

export interface ShareTokenWithUrl extends ShareToken {
  shareUrl: string
  isExpired: boolean
  cleanerId: string | null
  listingIds: string[] | null
  dateFrom: string | null
  dateTo: string | null
  expiresAt: string
  viewCount: number
  lastViewedAt: string | null
  isActive: boolean
  createdAt: string
}

export interface SharedScheduleResponse {
  shareInfo: {
    name: string | null
    cleanerId: string | null
    listingIds: string[] | null
    dateFrom: string | null
    dateTo: string | null
    expiresAt: string
  }
  schedule: any[]
  cleaners: any[]
  listings: any[]
}