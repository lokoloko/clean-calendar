import { testPool, runMigrations } from './setup'

export default async function globalSetup() {
  console.log('Setting up test database...')
  
  try {
    // Create test database if it doesn't exist
    const adminPool = new (require('pg').Pool)({
      connectionString: 'postgresql://postgres:postgres@localhost:5433/postgres',
    })

    try {
      await adminPool.query('CREATE DATABASE cleansweep_test')
    } catch (error) {
      // Database might already exist
    }
    
    await adminPool.end()

    // Run migrations
    await runMigrations()
    
    console.log('Test database setup complete')
  } catch (error) {
    console.error('Error setting up test database:', error)
    throw error
  }
}