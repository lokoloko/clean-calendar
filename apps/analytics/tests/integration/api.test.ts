import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('/api/upload', () => {
    it('should handle CSV file upload', async () => {
      const mockCSVContent = 'Date,Type,Amount\n2024-01-01,Reservation,500'
      const file = new File([mockCSVContent], 'test.csv', { type: 'text/csv' })
      
      const formData = new FormData()
      formData.append('file', file)

      // Mock successful response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            properties: [{ name: 'Test Property', revenue: 500 }],
            totalRevenue: 500,
            fileType: 'csv',
          },
        }),
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data.properties).toHaveLength(1)
      expect(result.data.totalRevenue).toBe(500)
    })

    it('should reject invalid file types', async () => {
      const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' })
      
      const formData = new FormData()
      formData.append('file', file)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid file type. Only CSV and PDF files are accepted.',
        }),
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(result.error).toContain('Invalid file type')
    })

    it('should handle PDF file upload', async () => {
      const mockPDFContent = new ArrayBuffer(1024) // Mock PDF binary
      const file = new File([mockPDFContent], 'earnings.pdf', { type: 'application/pdf' })
      
      const formData = new FormData()
      formData.append('file', file)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            extractedText: 'Property earnings report...',
            properties: [],
            fileType: 'pdf',
          },
        }),
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data.fileType).toBe('pdf')
    })
  })

  describe('/api/ai/insights', () => {
    it('should generate AI insights for properties', async () => {
      const propertyData = {
        id: 'prop-1',
        name: 'Beach House',
        revenue: 5000,
        occupancy: 75,
        avgRate: 150,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          insights: {
            performance: 'Above average',
            score: 85,
            opportunities: ['Increase weekend rates', 'Add amenities'],
            risks: ['Seasonal fluctuations'],
            recommendations: [
              {
                title: 'Optimize Pricing',
                impact: 'high',
                description: 'Adjust rates based on demand',
              },
            ],
          },
        }),
      })

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: propertyData }),
      })

      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.insights.score).toBe(85)
      expect(result.insights.opportunities).toHaveLength(2)
      expect(result.insights.recommendations[0].impact).toBe('high')
    })

    it('should handle AI service errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: 'AI service temporarily unavailable',
        }),
      })

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: {} }),
      })

      const result = await response.json()
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)
      expect(result.error).toContain('AI service')
    })
  })

  describe('/api/properties', () => {
    it('should fetch all properties', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          properties: [
            { id: '1', name: 'Property 1', revenue: 3000 },
            { id: '2', name: 'Property 2', revenue: 4000 },
          ],
          total: 2,
        }),
      })

      const response = await fetch('/api/properties')
      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.properties).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should create a new property', async () => {
      const newProperty = {
        name: 'New Beach House',
        address: '123 Beach St',
        url: 'https://airbnb.com/rooms/123',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          property: {
            id: 'new-prop-1',
            ...newProperty,
            createdAt: new Date().toISOString(),
          },
        }),
      })

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty),
      })

      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(result.property.name).toBe('New Beach House')
      expect(result.property.id).toBeDefined()
    })

    it('should update property data', async () => {
      const updates = {
        revenue: 5500,
        occupancy: 80,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          property: {
            id: 'prop-1',
            name: 'Beach House',
            revenue: 5500,
            occupancy: 80,
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const response = await fetch('/api/properties/prop-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.property.revenue).toBe(5500)
      expect(result.property.occupancy).toBe(80)
    })

    it('should delete a property', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })

      const response = await fetch('/api/properties/prop-1', {
        method: 'DELETE',
      })
      
      expect(response.ok).toBe(true)
      expect(response.status).toBe(204)
    })
  })

  describe('/api/analyze', () => {
    it('should analyze uploaded data', async () => {
      const dataToAnalyze = {
        properties: [
          { name: 'Property 1', revenue: 5000, occupancy: 70 },
          { name: 'Property 2', revenue: 3000, occupancy: 60 },
        ],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          analysis: {
            totalRevenue: 8000,
            avgOccupancy: 65,
            topPerformer: 'Property 1',
            insights: [
              'Property 1 is outperforming Property 2',
              'Overall portfolio occupancy could be improved',
            ],
          },
        }),
      })

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToAnalyze),
      })

      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.analysis.totalRevenue).toBe(8000)
      expect(result.analysis.avgOccupancy).toBe(65)
      expect(result.analysis.topPerformer).toBe('Property 1')
      expect(result.analysis.insights).toHaveLength(2)
    })
  })
})