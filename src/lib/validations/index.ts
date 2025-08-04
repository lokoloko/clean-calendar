import { z } from 'zod'

// Common validation schemas
export const idSchema = z.string().uuid('Invalid ID format')

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate)
  }
  return true
}, {
  message: 'Start date must be before end date',
})

// Phone number validation (North American 10-digit)
export const phoneSchema = z.string()
  .transform(val => val?.replace(/\D/g, '') || '') // Strip all non-numeric
  .refine(val => !val || val.length === 10, {
    message: 'Phone number must be exactly 10 digits'
  })
  .refine(val => !val || (val[0] !== '0' && val[0] !== '1'), {
    message: 'Phone number cannot start with 0 or 1'
  })
  .optional()

// Email validation
export const emailSchema = z.string().email('Invalid email format')

// Common entity schemas
export const cleanerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
  phone: phoneSchema,
  email: emailSchema.optional(),
})

export const listingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  ics_url: z.string().url('Invalid calendar URL').optional().nullable(),
  cleaning_fee: z.coerce.number().min(0, 'Cleaning fee must be positive').default(0),
  timezone: z.string().default('America/New_York'),
  is_active_on_airbnb: z.boolean().default(true),
})

export const assignmentSchema = z.object({
  listing_id: idSchema,
  cleaner_id: idSchema,
})

export const feedbackSchema = z.object({
  schedule_item_id: idSchema,
  cleanliness_rating: z.enum(['clean', 'normal', 'dirty']).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  completed_at: z.string().datetime().optional(),
})

export const manualScheduleSchema = z.object({
  listing_id: idSchema,
  cleaner_id: idSchema,
  frequency: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  days_of_week: z.array(z.number().min(0).max(6)).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  custom_interval_days: z.number().min(1).max(365).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  time_of_day: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').default('11:00'),
  notes: z.string().max(500).optional(),
})

export const shareTokenSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cleaner_id: idSchema.optional(),
  listing_ids: z.array(idSchema).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  expires_in_days: z.number().min(1).max(365).default(30),
})

// Helper function to validate request data
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
      throw new Error(`Validation failed: ${JSON.stringify(issues)}`)
    }
    throw error
  }
}