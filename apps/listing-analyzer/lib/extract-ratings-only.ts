// Focused Rating Extraction from Review Modal Screenshot
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface RatingSummary {
  overallRating: number
  totalReviews: number
  categoryRatings: {
    cleanliness: number
    accuracy: number
    checkIn: number
    communication: number
    location: number
    value?: number
  }
  guestFavorite: boolean
}

export async function extractRatingsFromScreenshot(
  screenshot: string,
  geminiKey: string
): Promise<RatingSummary | null> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `Extract the rating information from this Airbnb review modal screenshot.

Look for:
1. The main overall rating number (usually large, like "4.86" or "4.92")
2. Whether it says "Guest favorite"
3. The total number of reviews (e.g., "29 reviews")
4. The category ratings with their scores:
   - Cleanliness (number like 5.0)
   - Accuracy (number like 4.9)
   - Check-in (number like 4.9)
   - Communication (number like 4.9)
   - Location (number like 5.0)
   - Value (if visible)

Return ONLY a JSON object with this exact structure:
{
  "overallRating": 4.86,
  "totalReviews": 29,
  "guestFavorite": true,
  "categoryRatings": {
    "cleanliness": 5.0,
    "accuracy": 4.9,
    "checkIn": 4.9,
    "communication": 4.9,
    "location": 5.0,
    "value": 0
  }
}

Use 0 for any value that's not visible. Return ONLY the JSON, no other text.`

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: screenshot
        }
      },
      prompt
    ])
    
    const text = result.response.text()
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Vision AI response')
      return null
    }
    
    const data = JSON.parse(jsonMatch[0])
    
    return {
      overallRating: data.overallRating || 0,
      totalReviews: data.totalReviews || 0,
      categoryRatings: {
        cleanliness: data.categoryRatings?.cleanliness || 0,
        accuracy: data.categoryRatings?.accuracy || 0,
        checkIn: data.categoryRatings?.checkIn || data.categoryRatings?.checkin || 0,
        communication: data.categoryRatings?.communication || 0,
        location: data.categoryRatings?.location || 0,
        value: data.categoryRatings?.value || 0
      },
      guestFavorite: data.guestFavorite || false
    }
    
  } catch (error) {
    console.error('Failed to extract ratings:', error)
    return null
  }
}