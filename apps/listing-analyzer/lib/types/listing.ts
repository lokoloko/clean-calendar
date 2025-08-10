// Comprehensive Airbnb Listing Data Structure
export interface ComprehensiveAirbnbListing {
  // Basic Information
  id: string
  url: string
  title: string
  subtitle?: string
  description: string
  descriptionSections?: {
    overview?: string
    theSpace?: string
    guestAccess?: string
    otherThingsToNote?: string
    gettingAround?: string
  }
  propertyType: string // Entire place, Private room, Shared room
  roomType?: string // Studio, 1 bedroom, 2 bedrooms, etc.
  listingType?: string // Entire home, Apartment, House, Condo, Villa, etc.
  
  // Capacity & Spaces
  guestCapacity: {
    adults: number
    children: number
    infants: number
    total: number
  }
  spaces: {
    bedrooms: number
    beds: number
    bathrooms: number
    bathroomType?: string // Private, Shared
  }
  
  // Host Information
  host: {
    name: string
    id?: string
    profileUrl?: string
    profilePhoto?: string
    isSuperhost: boolean
    hostingSince?: string
    responseRate?: number
    responseTime?: string // "within an hour", "within a few hours", etc.
    about?: string
    languages?: string[]
    verifiedIdentity?: boolean
    listingsCount?: number
    reviewsCount?: number
    verifications?: string[] // Email, Phone, Government ID, etc.
  }
  
  // Detailed Pricing
  pricing: {
    basePrice: number
    currency: string
    cleaningFee?: number
    serviceFee?: number
    weeklyDiscount?: number
    monthlyDiscount?: number
    extraGuestFee?: number
    extraGuestThreshold?: number
    securityDeposit?: number
    taxes?: number
    totalBeforeTaxes?: number
  }
  
  // Location Details
  location: {
    address?: string
    neighborhood?: string
    city: string
    state?: string
    country: string
    zipCode?: string
    coordinates?: {
      lat: number
      lng: number
    }
    description?: string
    gettingAround?: string
    publicTransit?: string[]
    nearbyAttractions?: string[]
  }
  
  // Photos
  photos: {
    url: string
    caption?: string
    roomType?: string // Living room, Bedroom 1, Kitchen, etc.
    isMain?: boolean
    width?: number
    height?: number
  }[]
  
  // Comprehensive Amenities
  amenities: {
    basic?: string[] // Wifi, Kitchen, Washer, etc.
    bathroom?: string[] // Hair dryer, Shampoo, Hot water, etc.
    bedroom?: string[] // Hangers, Iron, Extra pillows, etc.
    entertainment?: string[] // TV, Cable, Netflix, Books, etc.
    family?: string[] // Crib, High chair, Toys, etc.
    heating?: string[] // Central heating, Fireplace, etc.
    homeSafety?: string[] // Smoke alarm, CO alarm, Fire extinguisher, etc.
    internet?: string[] // Wifi, Ethernet, Speed details
    kitchen?: string[] // Refrigerator, Microwave, Coffee maker, etc.
    location?: string[] // Beach access, Lake access, Ski-in/out, etc.
    outdoor?: string[] // BBQ, Patio, Garden, Pool, Hot tub, etc.
    parking?: string[] // Free parking, Street parking, Garage, etc.
    services?: string[] // Breakfast, Cleaning available, etc.
    notIncluded?: string[] // No AC, No heating, No TV, etc.
    accessibility?: string[] // Step-free access, Wide doorways, etc.
  }
  
  // Detailed Reviews
  reviews: {
    summary: {
      rating: number
      totalCount: number
      distribution: { // Star distribution
        5: number
        4: number
        3: number
        2: number
        1: number
      }
      categories: {
        cleanliness: number
        accuracy: number
        communication: number
        location: number
        checkIn: number
        value: number
      }
      highlightedKeywords?: string[] // "Sparkling clean", "Great location", etc.
    }
    recentReviews: Review[]
  }
  
  // Sleeping Arrangements
  sleepingArrangements?: {
    bedroom: string // "Bedroom 1", "Living room", etc.
    bedType: string // "1 queen bed", "2 single beds", etc.
    capacity: number
  }[]
  
  // House Rules & Policies
  houseRules: {
    checkIn: {
      time?: string // "After 3:00 PM"
      type?: string // "Self check-in", "Host greets you"
      instructions?: string
    }
    checkOut: {
      time?: string // "11:00 AM"
    }
    during: {
      smoking?: boolean
      pets?: boolean
      parties?: boolean
      visitors?: boolean
      quietHours?: string
      additionalRules?: string[]
    }
  }
  
  // Booking Settings
  bookingSettings: {
    instantBook?: boolean
    minimumStay?: number
    maximumStay?: number
    advanceNotice?: string // "Same day", "1 day", etc.
    preparationTime?: number // Days between bookings
    bookingWindow?: number // How far in advance can book
  }
  
  // Cancellation Policy
  cancellationPolicy: {
    type: string // "Flexible", "Moderate", "Strict", etc.
    description?: string
    details?: {
      timeframe: string
      refundPercentage: number
    }[]
  }
  
  // Calendar & Availability
  calendar?: {
    lastUpdated?: string
    availableDates?: string[]
    blockedDates?: string[]
    pricesByDate?: Record<string, number>
    minNightsByDate?: Record<string, number>
  }
  
  // Listing Performance Indicators
  performance?: {
    views?: number
    wishlistSaves?: number
    isRareFind?: boolean
    isSuperhost?: boolean
    isPlus?: boolean
    isBusinessReady?: boolean
    isPetFriendly?: boolean
    responseRate?: string
    badges?: string[] // "Highly rated", "Frequently booked", etc.
  }
  
  // Additional Services
  additionalServices?: {
    breakfast?: boolean
    airportPickup?: boolean
    luggageDropoff?: boolean
    groceryDelivery?: boolean
    tourBooking?: boolean
  }
  
  // Meta Information
  meta: {
    scrapedAt: string
    scrapeVersion: string
    dataCompleteness: number // 0-100 percentage
    missingFields?: string[]
    errors?: string[]
    proxyUsed?: string
  }
}

// Individual Review Structure
export interface Review {
  id?: string
  author: string
  authorLocation?: string
  authorProfileUrl?: string
  date: string
  rating?: number
  text: string
  language?: string
  translatedFrom?: string
  hostResponse?: {
    date: string
    text: string
  }
  helpful?: number
  stayDate?: string
  tripType?: string // "Business", "Family", "Couples", etc.
}

// Simplified version for initial implementation
export interface AirbnbListingData {
  // Core fields (backwards compatible)
  url: string
  title: string
  description: string
  price: number
  rating: number
  reviewCount: number
  amenities: string[]
  propertyType: string
  hostName?: string
  isSuperhost: boolean
  location?: string
  photos: number
  
  // New enhanced fields
  subtitle?: string
  hostResponseRate?: number
  hostResponseTime?: string
  cleaningFee?: number
  serviceFee?: number
  checkIn?: string
  checkOut?: string
  minimumStay?: number
  instantBook?: boolean
  
  // Review details
  reviewCategories?: {
    cleanliness: number
    accuracy: number
    communication: number
    location: number
    checkIn: number
    value: number
  }
  recentReviews?: {
    author: string
    date: string
    text: string
  }[]
  
  // More amenity categories
  amenityCategories?: {
    basic?: string[]
    safety?: string[]
    kitchen?: string[]
    bathroom?: string[]
    outdoor?: string[]
  }
  
  // House rules
  houseRules?: {
    smoking: boolean
    pets: boolean
    parties: boolean
    additionalRules?: string[]
  }
  
  // Meta
  lastScraped?: string
  dataQuality?: number // 0-100
  scrapingMethod?: string
  scrapingTime?: number
}