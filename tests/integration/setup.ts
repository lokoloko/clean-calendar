import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Test database connection
export const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cleansweep_test',
})

// Helper to run migrations on test database
export async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../supabase/migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      try {
        await testPool.query(sql)
      } catch (error) {
        console.error(`Error running migration ${file}:`, error)
      }
    }
  }
}

// Helper to clean database between tests
export async function cleanDatabase() {
  await testPool.query(`
    TRUNCATE TABLE 
      public.schedule_items,
      public.manual_schedule_rules,
      public.assignments,
      public.cleaners,
      public.listings,
      public.profiles,
      public.cleaner_feedback,
      public.cleaner_auth_codes,
      public.cleaner_sessions
    CASCADE
  `)
}

// Helper to seed test data
export async function seedTestData() {
  // Insert test user
  await testPool.query(`
    INSERT INTO public.profiles (id, email, full_name)
    VALUES ('test-user-id', 'test@example.com', 'Test User')
  `)

  // Insert test cleaners
  await testPool.query(`
    INSERT INTO public.cleaners (id, user_id, name, email, phone)
    VALUES 
      ('cleaner-1', 'test-user-id', 'John Doe', 'john@example.com', '1234567890'),
      ('cleaner-2', 'test-user-id', 'Jane Smith', 'jane@example.com', '0987654321')
  `)

  // Insert test listings
  await testPool.query(`
    INSERT INTO public.listings (id, user_id, name, ics_url, cleaning_fee, timezone, is_active_on_airbnb)
    VALUES 
      ('listing-1', 'test-user-id', 'Beach House', 'http://example.com/cal1.ics', 75, 'America/New_York', true),
      ('listing-2', 'test-user-id', 'Mountain Cabin', NULL, 100, 'America/Denver', false)
  `)

  // Insert test assignments
  await testPool.query(`
    INSERT INTO public.assignments (listing_id, cleaner_id)
    VALUES 
      ('listing-1', 'cleaner-1'),
      ('listing-2', 'cleaner-2')
  `)
}