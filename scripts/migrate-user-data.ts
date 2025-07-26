#!/usr/bin/env node

/**
 * Script to migrate data from dev user to authenticated user
 * Usage: npx tsx scripts/migrate-user-data.ts <new-user-id>
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Dev user ID from lib/supabase.ts
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

async function migrateUserData(newUserId: string) {
  console.log(`Migrating data from dev user ${DEV_USER_ID} to ${newUserId}...`)

  try {
    // Start a transaction
    const updates = []

    // Update listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', DEV_USER_ID)

    if (listingsError) throw listingsError

    if (listings && listings.length > 0) {
      console.log(`Found ${listings.length} listings to migrate`)
      const { error } = await supabase
        .from('listings')
        .update({ user_id: newUserId })
        .eq('user_id', DEV_USER_ID)
      
      if (error) throw error
      console.log('✓ Listings migrated')
    }

    // Update cleaners
    const { data: cleaners, error: cleanersError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', DEV_USER_ID)

    if (cleanersError) throw cleanersError

    if (cleaners && cleaners.length > 0) {
      console.log(`Found ${cleaners.length} cleaners to migrate`)
      const { error } = await supabase
        .from('cleaners')
        .update({ user_id: newUserId })
        .eq('user_id', DEV_USER_ID)
      
      if (error) throw error
      console.log('✓ Cleaners migrated')
    }

    // Update assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('cleaner_assignments')
      .select('id')
      .eq('user_id', DEV_USER_ID)

    if (assignmentsError) throw assignmentsError

    if (assignments && assignments.length > 0) {
      console.log(`Found ${assignments.length} assignments to migrate`)
      const { error } = await supabase
        .from('cleaner_assignments')
        .update({ user_id: newUserId })
        .eq('user_id', DEV_USER_ID)
      
      if (error) throw error
      console.log('✓ Assignments migrated')
    }

    // Update schedules (through listings relationship)
    // Schedules are linked to listings, so they'll automatically be associated
    // with the new user through the listing relationship

    console.log('\n✅ Migration completed successfully!')
    console.log('\nSummary:')
    console.log(`- Listings: ${listings?.length || 0}`)
    console.log(`- Cleaners: ${cleaners?.length || 0}`)
    console.log(`- Assignments: ${assignments?.length || 0}`)

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Check command line arguments
const newUserId = process.argv[2]

if (!newUserId) {
  console.log('Usage: npx tsx scripts/migrate-user-data.ts <new-user-id>')
  console.log('\nTo get your user ID:')
  console.log('1. Sign in with Google OAuth at /test-auth')
  console.log('2. Your user ID will be displayed on the page')
  process.exit(1)
}

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(newUserId)) {
  console.error('Invalid user ID format. Must be a valid UUID.')
  process.exit(1)
}

// Run migration
migrateUserData(newUserId)