/**
 * Local Gemini API configuration for Analytics app
 * This ensures the environment variables are read from the analytics app's context
 */

// Note: Gemini API keys are only available server-side for security
// Client code should use API endpoints instead

export const isGeminiConfigured = () => {
  // Always return true since we handle this server-side
  // The API will fallback to mock data if not configured
  return true
}

export const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash', // Fast model for analytics
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
}

// For production model (more accurate but slower)
export const GEMINI_PRO_CONFIG = {
  model: 'gemini-1.5-pro',
  temperature: 0.3, // Lower temperature for more consistent results
  maxTokens: 4096,
  topP: 0.95,
}