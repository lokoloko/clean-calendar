/**
 * Smart property matching algorithm that uses multiple factors to match
 * properties between PDF and CSV data sources
 */

interface PropertyData {
  name: string
  revenue: number
  nights?: number
  source: 'pdf' | 'csv'
}

interface MatchScore {
  pdfProperty: PropertyData
  csvProperty: PropertyData
  score: number
  factors: {
    revenueMatch: number
    nameMatch: number
    nightsMatch?: number
  }
}

export class PropertyMatcher {
  /**
   * Match properties between PDF and CSV using multiple factors
   */
  static matchProperties(
    pdfProperties: PropertyData[],
    csvProperties: PropertyData[]
  ): Map<string, string> {
    const matches = new Map<string, string>() // PDF name -> CSV name
    const unmatchedPdf = new Set(pdfProperties.map(p => p.name))
    const unmatchedCsv = new Set(csvProperties.map(p => p.name))
    
    // First pass: Try exact name matches (after normalization)
    for (const pdfProp of pdfProperties) {
      for (const csvProp of csvProperties) {
        if (this.normalizePropertyName(pdfProp.name) === this.normalizePropertyName(csvProp.name)) {
          matches.set(pdfProp.name, csvProp.name)
          unmatchedPdf.delete(pdfProp.name)
          unmatchedCsv.delete(csvProp.name)
          console.log(`Exact name match: "${pdfProp.name}" = "${csvProp.name}"`)
        }
      }
    }
    
    // Second pass: Use known mappings
    const knownMappings = this.getKnownMappings()
    for (const pdfProp of Array.from(unmatchedPdf)) {
      for (const csvProp of Array.from(unmatchedCsv)) {
        if (knownMappings[csvProp] === pdfProp) {
          matches.set(pdfProp, csvProp)
          unmatchedPdf.delete(pdfProp)
          unmatchedCsv.delete(csvProp)
          console.log(`Known mapping match: "${pdfProp}" = "${csvProp}"`)
        }
      }
    }
    
    // Third pass: Smart matching using revenue and other factors
    const remainingPdf = pdfProperties.filter(p => unmatchedPdf.has(p.name))
    const remainingCsv = csvProperties.filter(p => unmatchedCsv.has(p.name))
    
    if (remainingPdf.length > 0 && remainingCsv.length > 0) {
      const smartMatches = this.smartMatch(remainingPdf, remainingCsv)
      for (const [pdfName, csvName] of smartMatches) {
        matches.set(pdfName, csvName)
        console.log(`Smart match: "${pdfName}" = "${csvName}"`)
      }
    }
    
    return matches
  }
  
  /**
   * Smart matching algorithm using multiple factors
   */
  private static smartMatch(
    pdfProperties: PropertyData[],
    csvProperties: PropertyData[]
  ): Map<string, string> {
    const matches = new Map<string, string>()
    const scores: MatchScore[] = []
    
    // Calculate match scores for all combinations
    for (const pdfProp of pdfProperties) {
      for (const csvProp of csvProperties) {
        const score = this.calculateMatchScore(pdfProp, csvProp)
        scores.push({
          pdfProperty: pdfProp,
          csvProperty: csvProp,
          score: score.total,
          factors: score.factors
        })
        
        // Log high-scoring potential matches for debugging
        if (score.total >= 0.5) {
          console.log(
            `Potential match (score ${score.total.toFixed(2)}): ` +
            `"${pdfProp.name}" (PDF: $${pdfProp.revenue}) <-> ` +
            `"${csvProp.name}" (CSV: $${csvProp.revenue})`
          )
        }
      }
    }
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score)
    
    // Greedily assign matches based on highest scores
    const assignedPdf = new Set<string>()
    const assignedCsv = new Set<string>()
    
    for (const match of scores) {
      // Only match if score is above threshold and properties aren't already matched
      if (match.score >= 0.7 && 
          !assignedPdf.has(match.pdfProperty.name) && 
          !assignedCsv.has(match.csvProperty.name)) {
        
        matches.set(match.pdfProperty.name, match.csvProperty.name)
        assignedPdf.add(match.pdfProperty.name)
        assignedCsv.add(match.csvProperty.name)
        
        console.log(
          `Smart match with score ${match.score.toFixed(2)}: ` +
          `"${match.pdfProperty.name}" = "${match.csvProperty.name}" ` +
          `(revenue: ${match.factors.revenueMatch.toFixed(2)}, ` +
          `name: ${match.factors.nameMatch.toFixed(2)})`
        )
      }
    }
    
    return matches
  }
  
  /**
   * Calculate match score between two properties
   */
  private static calculateMatchScore(
    pdfProp: PropertyData,
    csvProp: PropertyData
  ): { total: number, factors: any } {
    const factors = {
      revenueMatch: 0,
      nameMatch: 0,
      nightsMatch: 0
    }
    
    // Revenue matching (most reliable factor)
    // Allow for small differences due to timing, fees, etc.
    if (pdfProp.revenue > 0 && csvProp.revenue > 0) {
      const revenueDiff = Math.abs(pdfProp.revenue - csvProp.revenue)
      const avgRevenue = (pdfProp.revenue + csvProp.revenue) / 2
      const revenueRatio = 1 - (revenueDiff / avgRevenue)
      
      // Log revenue comparison for debugging
      if (revenueRatio >= 0.7) {
        console.log(
          `Revenue comparison: "${pdfProp.name}" ($${pdfProp.revenue.toFixed(2)}) vs ` +
          `"${csvProp.name}" ($${csvProp.revenue.toFixed(2)}) = ` +
          `${(revenueRatio * 100).toFixed(1)}% match`
        )
      }
      
      // Strong match if within 5%
      if (revenueRatio >= 0.95) {
        factors.revenueMatch = 1.0
      } else if (revenueRatio >= 0.90) {
        factors.revenueMatch = 0.8
      } else if (revenueRatio >= 0.80) {
        factors.revenueMatch = 0.5
      } else {
        factors.revenueMatch = Math.max(0, revenueRatio * 0.3)
      }
    }
    
    // Name similarity matching
    factors.nameMatch = this.calculateNameSimilarity(pdfProp.name, csvProp.name)
    
    // Nights matching (if available)
    if (pdfProp.nights && csvProp.nights) {
      const nightsDiff = Math.abs(pdfProp.nights - csvProp.nights)
      const avgNights = (pdfProp.nights + csvProp.nights) / 2
      if (avgNights > 0) {
        factors.nightsMatch = Math.max(0, 1 - (nightsDiff / avgNights))
      }
    }
    
    // Calculate weighted total score
    const weights = {
      revenue: 0.6,  // Revenue is most reliable
      name: 0.3,     // Name similarity helps
      nights: 0.1    // Nights as supplementary
    }
    
    const total = 
      factors.revenueMatch * weights.revenue +
      factors.nameMatch * weights.name +
      (factors.nightsMatch || 0) * weights.nights
    
    return { total, factors }
  }
  
  /**
   * Calculate name similarity between two property names
   */
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const norm1 = this.normalizePropertyName(name1)
    const norm2 = this.normalizePropertyName(name2)
    
    // Check for common patterns
    if (this.hasCommonPattern(norm1, norm2)) {
      return 0.7
    }
    
    // Check for shared keywords
    const keywords1 = this.extractKeywords(norm1)
    const keywords2 = this.extractKeywords(norm2)
    const sharedKeywords = keywords1.filter(k => keywords2.includes(k))
    
    if (sharedKeywords.length > 0) {
      return Math.min(0.6, sharedKeywords.length * 0.2)
    }
    
    // Levenshtein distance for close matches
    const distance = this.levenshteinDistance(norm1, norm2)
    const maxLength = Math.max(norm1.length, norm2.length)
    const similarity = 1 - (distance / maxLength)
    
    return Math.max(0, similarity * 0.5)
  }
  
  /**
   * Check if names share common patterns (like Unit 1, Unit A, etc.)
   */
  private static hasCommonPattern(name1: string, name2: string): boolean {
    const patterns = [
      /unit\s*[a-z0-9]+/i,
      /apt\s*[a-z0-9]+/i,
      /suite\s*[a-z0-9]+/i,
      /room\s*[a-z0-9]+/i
    ]
    
    for (const pattern of patterns) {
      const match1 = name1.match(pattern)
      const match2 = name2.match(pattern)
      if (match1 && match2 && match1[0] === match2[0]) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Extract keywords from property name
   */
  private static extractKeywords(name: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'in', 'at', 'to', 'for', 'with', 'by']
    const words = name.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w))
    
    // Also extract location keywords
    const locations = ['monrovia', 'azusa', 'glendora', 'pasadena', 'arcadia']
    const foundLocations = locations.filter(loc => name.toLowerCase().includes(loc))
    
    return [...new Set([...words, ...foundLocations])]
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
    
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          )
        }
      }
    }
    
    return dp[m][n]
  }
  
  /**
   * Normalize property name for comparison
   */
  private static normalizePropertyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove special chars
      .replace(/\s+/g, ' ')       // Normalize spaces
      .trim()
  }
  
  /**
   * Get known property mappings
   */
  private static getKnownMappings(): Record<string, string> {
    return {
      'Tranquil Apartment Steps from Old Town Monrovia': 'Unit 1',
      'Monrovia Charm - Exclusive Rental Unit': 'Unit 2',
      'Private Studio Apartment - Great Location': 'Unit 3',
      'Old Town Monrovia Bungalow': 'Unit 4',
      'Minutes Wlk 2  OT Monrovia - 3 mile 2 City of Hope': 'Monrovia A',
      'Mountain View Getaway - 2 beds 1 bath Entire Unit': 'Monrovia B',
      'Private Bungalow near Old Town Monrovia': 'Unit C',
      'Adorable Affordable Studio Guest House': 'Unit D',
      'Work Away from Home Apartment': 'Unit A',
      'Comfortable Apartment for Two': 'Unit L1',
      'Cozy Stopover: Rest, Refresh, Nourish': 'Unit L2',
      'Serene Glendora Home w/ Pool & Prime Location': 'Unit G',
      'Modern RV • Quick Cozy Stay': 'L3 - Trailer',
      'Lovely 2 large bedrooms w/ 1.5 bath. Free parking.': 'Glendora'
    }
  }
}