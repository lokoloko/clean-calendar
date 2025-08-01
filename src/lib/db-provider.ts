/**
 * Database provider that automatically selects the appropriate implementation
 * based on the runtime environment
 */

// Use edge-compatible Supabase client in production/Vercel
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL

export const db = isProduction 
  ? require('./db-edge').db 
  : require('./db').db