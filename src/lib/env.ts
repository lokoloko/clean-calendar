/**
 * Environment configuration helpers
 * Provides type-safe access to environment variables with validation
 */

export const env = {
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Feature flags
  useAuth: process.env.NEXT_PUBLIC_USE_AUTH === 'true',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Server
  port: process.env.PORT || '3000',
  
  // Dev mode user (for backwards compatibility)
  devUserId: '00000000-0000-0000-0000-000000000001',
} as const;

/**
 * Validates that required environment variables are set
 * Should be called during app initialization
 */
export function validateEnv() {
  const required: Array<keyof typeof env | string> = [];
  const errors: string[] = [];

  // Always required
  if (!env.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  // Required in production
  if (env.isProduction) {
    if (!env.supabase.url) errors.push('NEXT_PUBLIC_SUPABASE_URL is required in production');
    if (!env.supabase.anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in production');
    if (env.useAuth && !env.supabase.serviceRoleKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required when auth is enabled');
    }
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    if (env.isProduction) {
      throw new Error('Environment validation failed');
    }
  }
}

/**
 * Get the current user ID based on auth mode
 * In dev mode without auth, returns the dev user ID
 * Otherwise should use Supabase auth
 */
export function getCurrentUserId(): string {
  // This will be replaced with proper auth logic
  // For now, always return dev user ID
  return env.devUserId;
}

/**
 * Check if we're in dev mode (no auth)
 */
export function isDevMode(): boolean {
  return !env.useAuth && env.isDevelopment;
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser should use relative URLs
    return '';
  }
  
  // Server-side base URL
  if (process.env.VERCEL_URL) {
    // Vercel deployment
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.RENDER_EXTERNAL_URL) {
    // Render deployment
    return process.env.RENDER_EXTERNAL_URL;
  }
  
  // Local development
  return `http://localhost:${env.port}`;
}