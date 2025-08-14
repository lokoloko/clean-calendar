/**
 * Shared Gemini API configuration
 * Used by both Calendar and Analytics apps
 */

export const getGeminiApiKey = () => {
  // Check multiple possible env var names for compatibility
  const apiKey = 
    process.env.GEMINI_API_KEY || 
    process.env.GOOGLE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.warn('Gemini API key not found. AI features will be limited.')
  }

  return apiKey
}

export const isGeminiConfigured = () => {
  return !!getGeminiApiKey()
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