import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('AI Insights Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePrompt', () => {
    it('should generate correct prompt for property analysis', () => {
      const generatePrompt = (propertyData: any) => {
        return `Analyze this Airbnb property data and provide insights:
        
Property: ${propertyData.name}
Monthly Revenue: $${propertyData.revenue}
Occupancy Rate: ${propertyData.occupancy}%
Average Nightly Rate: $${propertyData.avgRate}
Total Reviews: ${propertyData.reviews}

Please provide:
1. Performance assessment
2. Growth opportunities
3. Risk factors
4. Optimization recommendations`
      }

      const property = {
        name: 'Beach House Studio',
        revenue: 5000,
        occupancy: 75,
        avgRate: 150,
        reviews: 45,
      }

      const prompt = generatePrompt(property)
      
      expect(prompt).toContain('Beach House Studio')
      expect(prompt).toContain('$5000')
      expect(prompt).toContain('75%')
      expect(prompt).toContain('Performance assessment')
    })

    it('should handle missing data gracefully', () => {
      const generatePrompt = (propertyData: any) => {
        const name = propertyData.name || 'Unknown Property'
        const revenue = propertyData.revenue || 0
        const occupancy = propertyData.occupancy || 0
        
        return `Property: ${name}, Revenue: $${revenue}, Occupancy: ${occupancy}%`
      }

      const incompleteProperty = { name: 'Test Property' }
      const prompt = generatePrompt(incompleteProperty)
      
      expect(prompt).toContain('Test Property')
      expect(prompt).toContain('$0')
      expect(prompt).toContain('0%')
    })
  })

  describe('parseAIResponse', () => {
    it('should parse structured AI response correctly', () => {
      const parseAIResponse = (response: string) => {
        const insights = {
          performance: '',
          opportunities: [],
          risks: [],
          recommendations: [],
        }

        // Simple parsing logic for structured response
        const sections = response.split('\n\n')
        sections.forEach(section => {
          if (section.includes('Performance:')) {
            insights.performance = section.replace('Performance:', '').trim()
          } else if (section.includes('Opportunities:')) {
            insights.opportunities = section
              .replace('Opportunities:', '')
              .split('\n')
              .filter(line => line.trim())
              .map(line => line.replace(/^[-*]\s*/, '').trim())
          } else if (section.includes('Risks:')) {
            insights.risks = section
              .replace('Risks:', '')
              .split('\n')
              .filter(line => line.trim())
              .map(line => line.replace(/^[-*]\s*/, '').trim())
          } else if (section.includes('Recommendations:')) {
            insights.recommendations = section
              .replace('Recommendations:', '')
              .split('\n')
              .filter(line => line.trim())
              .map(line => line.replace(/^[-*]\s*/, '').trim())
          }
        })

        return insights
      }

      const mockResponse = `Performance: Property is performing above market average with 75% occupancy

Opportunities:
- Increase rates during peak season
- Add professional photography
- Optimize listing description

Risks:
- High competition in area
- Seasonal demand fluctuations

Recommendations:
- Update pricing strategy
- Improve amenities
- Focus on guest experience`

      const insights = parseAIResponse(mockResponse)
      
      expect(insights.performance).toContain('above market average')
      expect(insights.opportunities).toHaveLength(3)
      expect(insights.opportunities[0]).toBe('Increase rates during peak season')
      expect(insights.risks).toHaveLength(2)
      expect(insights.recommendations).toHaveLength(3)
    })

    it('should calculate confidence scores', () => {
      const calculateConfidence = (dataCompleteness: number, dataPoints: number) => {
        // Base confidence on data completeness and number of data points
        let confidence = 0
        
        // Data completeness contributes 60%
        confidence += (dataCompleteness / 100) * 60
        
        // Number of data points contributes 40%
        if (dataPoints >= 100) confidence += 40
        else if (dataPoints >= 50) confidence += 30
        else if (dataPoints >= 20) confidence += 20
        else if (dataPoints >= 10) confidence += 10
        
        return Math.round(confidence)
      }

      expect(calculateConfidence(100, 150)).toBe(100)
      expect(calculateConfidence(80, 60)).toBe(78) // 48 + 30
      expect(calculateConfidence(50, 15)).toBe(40) // 30 + 10
      expect(calculateConfidence(30, 5)).toBe(18) // 18 + 0
    })
  })

  describe('generateRecommendations', () => {
    it('should prioritize recommendations by impact', () => {
      const generateRecommendations = (metrics: any) => {
        const recommendations = []
        
        // Low occupancy recommendation
        if (metrics.occupancy < 60) {
          recommendations.push({
            title: 'Improve Occupancy Rate',
            impact: 'high',
            priority: 1,
            description: 'Your occupancy is below 60%. Consider adjusting pricing or improving listing visibility.',
          })
        }
        
        // Pricing optimization
        if (metrics.avgRate < metrics.marketAvg * 0.9) {
          recommendations.push({
            title: 'Increase Pricing',
            impact: 'high',
            priority: 2,
            description: 'Your rates are below market average. You could increase by 10-15%.',
          })
        }
        
        // Review improvement
        if (metrics.reviewScore < 4.5) {
          recommendations.push({
            title: 'Improve Guest Satisfaction',
            impact: 'medium',
            priority: 3,
            description: 'Focus on cleanliness and communication to improve reviews.',
          })
        }
        
        return recommendations.sort((a, b) => a.priority - b.priority)
      }

      const metrics = {
        occupancy: 45,
        avgRate: 100,
        marketAvg: 120,
        reviewScore: 4.3,
      }

      const recommendations = generateRecommendations(metrics)
      
      expect(recommendations).toHaveLength(3)
      expect(recommendations[0].title).toBe('Improve Occupancy Rate')
      expect(recommendations[0].impact).toBe('high')
      expect(recommendations[1].title).toBe('Increase Pricing')
    })

    it('should generate seasonal recommendations', () => {
      const generateSeasonalRecommendations = (monthlyData: any[]) => {
        const recommendations = []
        
        // Analyze seasonal patterns
        const summerMonths = monthlyData.filter(m => [6, 7, 8].includes(m.month))
        const winterMonths = monthlyData.filter(m => [12, 1, 2].includes(m.month))
        
        const summerAvg = summerMonths.reduce((sum, m) => sum + m.revenue, 0) / summerMonths.length || 0
        const winterAvg = winterMonths.reduce((sum, m) => sum + m.revenue, 0) / winterMonths.length || 0
        
        if (summerAvg > winterAvg * 1.5) {
          recommendations.push({
            type: 'seasonal',
            insight: 'Strong summer performance',
            action: 'Maximize summer pricing and consider winter promotions',
          })
        }
        
        return recommendations
      }

      const monthlyData = [
        { month: 6, revenue: 5000 },
        { month: 7, revenue: 5500 },
        { month: 8, revenue: 5200 },
        { month: 12, revenue: 2000 },
        { month: 1, revenue: 1800 },
        { month: 2, revenue: 2200 },
      ]

      const recommendations = generateSeasonalRecommendations(monthlyData)
      
      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].type).toBe('seasonal')
      expect(recommendations[0].insight).toContain('summer performance')
    })
  })
})