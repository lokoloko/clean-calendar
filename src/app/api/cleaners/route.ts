import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { canCreateCleaner } from '@/lib/subscription'
import { withApiHandler, parseRequestBody, createApiResponse } from '@/lib/api-wrapper'
import { ApiError } from '@/lib/api-errors'
import { cleanerSchema } from '@/lib/validations'

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireAuth()
  const cleaners = await db.getCleaners(user.id)
  return createApiResponse.success(cleaners)
})

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireAuth()
  
  // Check if user can create more cleaners
  const canCreate = await canCreateCleaner(user.id)
  if (!canCreate.allowed) {
    throw new ApiError(403, canCreate.reason || 'Limit reached', 'CLEANER_LIMIT_REACHED', {
      limit: canCreate.limit,
      current: canCreate.current,
      upgradeUrl: '/billing/upgrade?feature=cleaners'
    })
  }
  
  // Validate request body with Zod
  const validatedData = await parseRequestBody(req, cleanerSchema)

  const cleaner = await db.createCleaner(user.id, validatedData)

  return createApiResponse.created(cleaner)
})