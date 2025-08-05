import {
  idSchema,
  paginationSchema,
  dateRangeSchema,
  phoneSchema,
  emailSchema,
  cleanerSchema,
  listingSchema,
  assignmentSchema,
  feedbackSchema,
  manualScheduleSchema,
  shareTokenSchema,
  validateRequest
} from '../index'

describe('Validation Schemas', () => {
  describe('idSchema', () => {
    it('should validate UUID format', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000'
      expect(idSchema.parse(validId)).toBe(validId)
    })

    it('should reject invalid UUID', () => {
      expect(() => idSchema.parse('invalid-uuid')).toThrow('Invalid ID format')
    })
  })

  describe('paginationSchema', () => {
    it('should provide defaults', () => {
      const result = paginationSchema.parse({})
      expect(result).toEqual({ page: 1, limit: 20 })
    })

    it('should coerce string values', () => {
      const result = paginationSchema.parse({ page: '2', limit: '50' })
      expect(result).toEqual({ page: 2, limit: 50 })
    })

    it('should enforce max limit', () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow()
    })

    it('should reject negative values', () => {
      expect(() => paginationSchema.parse({ page: -1 })).toThrow()
    })
  })

  describe('dateRangeSchema', () => {
    it('should accept valid date range', () => {
      const dates = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z'
      }
      expect(dateRangeSchema.parse(dates)).toEqual(dates)
    })

    it('should accept partial date range', () => {
      expect(dateRangeSchema.parse({ startDate: '2024-01-01T00:00:00Z' }))
        .toEqual({ startDate: '2024-01-01T00:00:00Z' })
    })

    it('should reject invalid date order', () => {
      const dates = {
        startDate: '2024-12-31T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z'
      }
      expect(() => dateRangeSchema.parse(dates)).toThrow('Start date must be before end date')
    })
  })

  describe('phoneSchema', () => {
    it('should accept valid phone numbers and normalize them', () => {
      const validPhones = [
        { input: '555 123 4567', expected: '5551234567' },
        { input: '(555) 123-4567', expected: '5551234567' },
        { input: '5551234567', expected: '5551234567' },
        { input: '2134567890', expected: '2134567890' }
      ]
      
      validPhones.forEach(({ input, expected }) => {
        expect(phoneSchema.parse(input)).toBe(expected)
      })
    })

    it('should reject phone numbers starting with 0 or 1', () => {
      expect(() => phoneSchema.parse('1234567890')).toThrow('Phone number cannot start with 0 or 1')
      expect(() => phoneSchema.parse('0234567890')).toThrow('Phone number cannot start with 0 or 1')
    })

    it('should handle country code prefix', () => {
      // Numbers with +1 prefix get stripped to 11 digits, which then fail validation
      expect(() => phoneSchema.parse('+1-555-123-4567')).toThrow('Phone number must be exactly 10 digits')
      expect(() => phoneSchema.parse('+12134567890')).toThrow('Phone number must be exactly 10 digits')
    })

    it('should reject too short numbers', () => {
      expect(() => phoneSchema.parse('123')).toThrow('Phone number must be exactly 10 digits')
    })

    it('should reject too long numbers', () => {
      expect(() => phoneSchema.parse('12345678901')).toThrow('Phone number must be exactly 10 digits')
    })

    it('should be optional', () => {
      expect(phoneSchema.parse(undefined)).toBeUndefined()
      expect(phoneSchema.parse('')).toBe('')
    })
  })

  describe('emailSchema', () => {
    it('should accept valid email', () => {
      expect(emailSchema.parse('test@example.com')).toBe('test@example.com')
    })

    it('should reject invalid email', () => {
      expect(() => emailSchema.parse('invalid-email')).toThrow('Invalid email format')
    })
  })

  describe('cleanerSchema', () => {
    it('should validate cleaner data', () => {
      const cleaner = {
        name: 'John Doe',
        phone: '555-123-4567',
        email: 'john@example.com'
      }
      expect(cleanerSchema.parse(cleaner)).toEqual({
        name: 'John Doe',
        phone: '5551234567', // Phone is normalized
        email: 'john@example.com'
      })
    })

    it('should require name', () => {
      expect(() => cleanerSchema.parse({})).toThrow('Required')
    })

    it('should accept cleaner without phone/email', () => {
      const cleaner = { name: 'Jane Doe' }
      expect(cleanerSchema.parse(cleaner)).toEqual(cleaner)
    })

    it('should enforce name length', () => {
      expect(() => cleanerSchema.parse({ name: 'a'.repeat(101) }))
        .toThrow('Name too long')
    })
  })

  describe('listingSchema', () => {
    it('should validate listing data with defaults', () => {
      const listing = { name: 'Beach House' }
      const result = listingSchema.parse(listing)
      
      expect(result).toEqual({
        name: 'Beach House',
        cleaning_fee: 0,
        timezone: 'America/New_York',
        is_active_on_airbnb: true
      })
    })

    it('should accept full listing data', () => {
      const listing = {
        name: 'Mountain Cabin',
        ics_url: 'https://airbnb.com/calendar/ical/123.ics',
        cleaning_fee: 150,
        timezone: 'America/Denver',
        is_active_on_airbnb: false
      }
      expect(listingSchema.parse(listing)).toEqual(listing)
    })

    it('should validate URL format', () => {
      expect(() => listingSchema.parse({
        name: 'Test',
        ics_url: 'not-a-url'
      })).toThrow('Invalid calendar URL')
    })

    it('should coerce cleaning fee', () => {
      const result = listingSchema.parse({
        name: 'Test',
        cleaning_fee: '100.50'
      })
      expect(result.cleaning_fee).toBe(100.5)
    })
  })

  describe('assignmentSchema', () => {
    it('should validate assignment data', () => {
      const assignment = {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        cleaner_id: '987e6543-e21b-12d3-a456-426614174000'
      }
      expect(assignmentSchema.parse(assignment)).toEqual(assignment)
    })

    it('should require both IDs', () => {
      expect(() => assignmentSchema.parse({ listing_id: '123e4567-e89b-12d3-a456-426614174000' }))
        .toThrow()
    })
  })

  describe('feedbackSchema', () => {
    it('should validate feedback data', () => {
      const feedback = {
        schedule_item_id: '123e4567-e89b-12d3-a456-426614174000',
        cleanliness_rating: 'clean',
        notes: 'Great job!',
        completed_at: '2024-01-01T10:00:00Z'
      }
      expect(feedbackSchema.parse(feedback)).toEqual(feedback)
    })

    it('should accept minimal feedback', () => {
      const feedback = {
        schedule_item_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      expect(feedbackSchema.parse(feedback)).toEqual(feedback)
    })

    it('should validate rating enum', () => {
      expect(() => feedbackSchema.parse({
        schedule_item_id: '123e4567-e89b-12d3-a456-426614174000',
        cleanliness_rating: 'invalid'
      })).toThrow()
    })

    it('should enforce notes length', () => {
      expect(() => feedbackSchema.parse({
        schedule_item_id: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'a'.repeat(501)
      })).toThrow('Notes too long')
    })
  })

  describe('manualScheduleSchema', () => {
    it('should validate manual schedule', () => {
      const schedule = {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        cleaner_id: '987e6543-e21b-12d3-a456-426614174000',
        frequency: 'weekly',
        days_of_week: [1, 3, 5],
        start_date: '2024-01-01T00:00:00Z',
        time_of_day: '10:00'
      }
      expect(manualScheduleSchema.parse(schedule)).toEqual(schedule)
    })

    it('should provide default time', () => {
      const schedule = {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        cleaner_id: '987e6543-e21b-12d3-a456-426614174000',
        frequency: 'daily',
        start_date: '2024-01-01T00:00:00Z'
      }
      const result = manualScheduleSchema.parse(schedule)
      expect(result.time_of_day).toBe('11:00')
    })

    it('should validate time format', () => {
      expect(() => manualScheduleSchema.parse({
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        cleaner_id: '987e6543-e21b-12d3-a456-426614174000',
        frequency: 'daily',
        start_date: '2024-01-01T00:00:00Z',
        time_of_day: '25:00'
      })).toThrow('Invalid time format (HH:MM)')
    })

    it('should validate day of week range', () => {
      expect(() => manualScheduleSchema.parse({
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        cleaner_id: '987e6543-e21b-12d3-a456-426614174000',
        frequency: 'weekly',
        days_of_week: [7],
        start_date: '2024-01-01T00:00:00Z'
      })).toThrow()
    })
  })

  describe('shareTokenSchema', () => {
    it('should validate share token data', () => {
      const token = {
        name: 'Weekly Schedule',
        cleaner_id: '123e4567-e89b-12d3-a456-426614174000',
        expires_in_days: 7
      }
      expect(shareTokenSchema.parse(token)).toEqual(token)
    })

    it('should provide default expiry', () => {
      const result = shareTokenSchema.parse({})
      expect(result.expires_in_days).toBe(30)
    })

    it('should validate expiry range', () => {
      expect(() => shareTokenSchema.parse({ expires_in_days: 366 })).toThrow()
      expect(() => shareTokenSchema.parse({ expires_in_days: 0 })).toThrow()
    })
  })

  describe('validateRequest', () => {
    it('should validate data against schema', () => {
      const schema = cleanerSchema
      const data = { name: 'Test Cleaner', phone: '555-1234567' }
      
      expect(validateRequest(schema, data)).toEqual({
        name: 'Test Cleaner',
        phone: '5551234567' // Phone is normalized
      })
    })

    it('should throw formatted error for invalid data', () => {
      const schema = cleanerSchema
      const data = { phone: '555-1234567' } // Missing name
      
      expect(() => validateRequest(schema, data))
        .toThrow('Validation failed')
    })
  })
})