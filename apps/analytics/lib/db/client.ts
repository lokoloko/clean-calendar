import { Pool } from 'pg'

// Create a connection pool for the analytics database
// Use environment variable if available (for Docker), otherwise use localhost
const isDocker = process.env.DATABASE_URL?.includes('db:5432')
const pool = new Pool({
  host: isDocker ? 'db' : 'localhost',
  port: isDocker ? 5432 : 5434,  // Docker internal port is 5432
  database: 'cleansweep',
  user: 'postgres',
  password: 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test the connection
pool.on('connect', () => {
  console.log('Connected to analytics database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export async function getClient() {
  const client = await pool.connect()
  return client
}

export default pool