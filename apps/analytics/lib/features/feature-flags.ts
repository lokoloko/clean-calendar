/**
 * Feature flags for gradual rollout of new features
 */

export enum FeatureFlag {
  USE_DATABASE_STORAGE = 'use_database_storage',
  DUAL_WRITE_MODE = 'dual_write_mode',
  ENABLE_MIGRATION = 'enable_migration'
}

interface FeatureFlagConfig {
  name: string
  description: string
  defaultValue: boolean
  rolloutPercentage?: number // For gradual rollout
}

const FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.USE_DATABASE_STORAGE]: {
    name: 'Use Database Storage',
    description: 'Switch from localStorage to database storage',
    defaultValue: true, // Enable database storage
    rolloutPercentage: 100 // Enable for all users
  },
  [FeatureFlag.DUAL_WRITE_MODE]: {
    name: 'Dual Write Mode',
    description: 'Write to both localStorage and database during migration',
    defaultValue: false,
    rolloutPercentage: 100 // Enable for all during migration
  },
  [FeatureFlag.ENABLE_MIGRATION]: {
    name: 'Enable Migration',
    description: 'Allow one-time migration from localStorage to database',
    defaultValue: false
  }
}

export class FeatureFlags {
  private static STORAGE_KEY = 'gostudiom_feature_flags'
  private static overrides: Map<FeatureFlag, boolean> = new Map()

  /**
   * Check if a feature flag is enabled
   */
  static isEnabled(flag: FeatureFlag): boolean {
    // Check URL parameters for testing
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlValue = urlParams.get(`ff_${flag}`)
      if (urlValue !== null) {
        return urlValue === 'true'
      }
    }

    // Check local overrides
    if (this.overrides.has(flag)) {
      return this.overrides.get(flag)!
    }

    // Check localStorage for user preferences
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        try {
          const flags = JSON.parse(stored)
          if (flag in flags) {
            return flags[flag]
          }
        } catch (e) {
          console.error('Error parsing feature flags:', e)
        }
      }
    }

    // Check rollout percentage
    const config = FLAGS[flag]
    if (config.rolloutPercentage !== undefined) {
      const userId = this.getUserId()
      const hash = this.hashCode(userId + flag)
      const percentage = Math.abs(hash) % 100
      if (percentage < config.rolloutPercentage) {
        return true
      }
    }

    // Return default value
    return FLAGS[flag].defaultValue
  }

  /**
   * Override a feature flag value (for testing)
   */
  static override(flag: FeatureFlag, value: boolean): void {
    this.overrides.set(flag, value)
  }

  /**
   * Clear all overrides
   */
  static clearOverrides(): void {
    this.overrides.clear()
  }

  /**
   * Set user preference for a feature flag
   */
  static setUserPreference(flag: FeatureFlag, value: boolean): void {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(this.STORAGE_KEY)
    const flags = stored ? JSON.parse(stored) : {}
    flags[flag] = value
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flags))
  }

  /**
   * Get all feature flags with their current values
   */
  static getAll(): Record<FeatureFlag, boolean> {
    const result: Record<string, boolean> = {} as any
    
    for (const flag of Object.values(FeatureFlag)) {
      result[flag] = this.isEnabled(flag)
    }
    
    return result as Record<FeatureFlag, boolean>
  }

  /**
   * Get feature flag configuration
   */
  static getConfig(flag: FeatureFlag): FeatureFlagConfig {
    return FLAGS[flag]
  }

  /**
   * Get or generate a user ID for rollout percentage
   */
  private static getUserId(): string {
    if (typeof window === 'undefined') return 'server'

    let userId = localStorage.getItem('gostudiom_user_id')
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('gostudiom_user_id', userId)
    }
    return userId
  }

  /**
   * Simple hash function for rollout percentage
   */
  private static hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }
}

// Export convenience functions
export const isFeatureEnabled = (flag: FeatureFlag) => FeatureFlags.isEnabled(flag)
export const setFeatureFlag = (flag: FeatureFlag, value: boolean) => FeatureFlags.setUserPreference(flag, value)