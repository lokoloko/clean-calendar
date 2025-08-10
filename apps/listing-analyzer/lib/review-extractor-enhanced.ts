// Enhanced review extraction with rating distribution and categories
import { Page } from 'puppeteer-core'

export interface ReviewDistribution {
  5: number  // percentage of 5-star reviews
  4: number  // percentage of 4-star reviews
  3: number  // percentage of 3-star reviews
  2: number  // percentage of 2-star reviews
  1: number  // percentage of 1-star reviews
}

export interface ReviewCategories {
  cleanliness: number
  accuracy: number
  checkin: number
  communication: number
  location: number
  value: number
}

export interface EnhancedReviewData {
  overallRating: number
  totalCount: number
  distribution: ReviewDistribution
  categories: ReviewCategories
  reviews: Array<{
    author: string
    date: string
    text: string
    rating?: number
  }>
}

export async function extractEnhancedReviews(page: Page): Promise<EnhancedReviewData> {
  const reviewData: EnhancedReviewData = {
    overallRating: 0,
    totalCount: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    categories: {
      cleanliness: 0,
      accuracy: 0,
      checkin: 0,
      communication: 0,
      location: 0,
      value: 0
    },
    reviews: []
  }
  
  // Extract from the modal
  const extractedData = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
    if (!modal) return null
    
    const data: any = {
      overallRating: 0,
      totalCount: 0,
      distribution: {},
      categories: {},
      reviews: []
    }
    
    // Extract overall rating and count
    // Look for pattern like "4.81 out of 5 stars from 83 reviews" or "4.81 · 83 reviews"
    const modalText = modal.textContent || ''
    
    // Try to find overall rating
    const ratingMatch = modalText.match(/(\d+\.?\d*)\s*(out of 5 stars?|·|stars?)/i)
    if (ratingMatch) {
      data.overallRating = parseFloat(ratingMatch[1])
    }
    
    // Try to find total review count
    const countMatch = modalText.match(/(\d+)\s*reviews?/i)
    if (countMatch) {
      data.totalCount = parseInt(countMatch[1])
    }
    
    // Extract rating distribution
    // Look for patterns like "5 stars, 82% of reviews" or just percentages near star numbers
    const distributionSection = modal.querySelector('[class*="distribution"], [data-testid*="distribution"]')
    if (distributionSection) {
      // Method 1: Look for explicit percentage labels
      for (let stars = 5; stars >= 1; stars--) {
        const regex = new RegExp(`${stars}\\s*stars?,?\\s*(\\d+)%`, 'i')
        const match = distributionSection.textContent?.match(regex)
        if (match) {
          data.distribution[stars] = parseInt(match[1])
        }
      }
    }
    
    // Fallback: Search entire modal for distribution patterns
    if (Object.keys(data.distribution).length === 0) {
      for (let stars = 5; stars >= 1; stars--) {
        // Look for various patterns
        const patterns = [
          new RegExp(`${stars}\\s*stars?,?\\s*(\\d+)%`, 'i'),
          new RegExp(`(\\d+)%.*${stars}\\s*stars?`, 'i'),
          new RegExp(`${stars}\\s*[⭐★].*?(\\d+)%`, 'i')
        ]
        
        for (const pattern of patterns) {
          const match = modalText.match(pattern)
          if (match) {
            data.distribution[stars] = parseInt(match[1])
            break
          }
        }
      }
    }
    
    // Extract category ratings
    const categoryMappings = [
      { key: 'cleanliness', patterns: ['Cleanliness', 'Clean'] },
      { key: 'accuracy', patterns: ['Accuracy', 'Accurate'] },
      { key: 'checkin', patterns: ['Check-in', 'Checkin', 'Check in'] },
      { key: 'communication', patterns: ['Communication', 'Communicate'] },
      { key: 'location', patterns: ['Location'] },
      { key: 'value', patterns: ['Value'] }
    ]
    
    categoryMappings.forEach(({ key, patterns }) => {
      for (const pattern of patterns) {
        // Look for pattern like "Cleanliness 4.9" or "Rated 4.9 out of 5 stars for cleanliness"
        const regex1 = new RegExp(`${pattern}[\\s\\n]*(\\d+\\.?\\d*)`, 'i')
        const regex2 = new RegExp(`Rated\\s*(\\d+\\.?\\d*).*?${pattern}`, 'i')
        const regex3 = new RegExp(`${pattern}.*?(?:rated?|score|:)\\s*(\\d+\\.?\\d*)`, 'i')
        
        let match = modalText.match(regex1) || modalText.match(regex2) || modalText.match(regex3)
        if (match) {
          data.categories[key] = parseFloat(match[1])
          break
        }
      }
    })
    
    // Extract individual reviews
    const reviewContainers = modal.querySelectorAll('[data-testid*="review"], [aria-label*="review"], div[role="article"]')
    
    reviewContainers.forEach(container => {
      const reviewItem: any = {
        author: '',
        date: '',
        text: '',
        rating: null
      }
      
      // Extract author
      const authorEl = container.querySelector('h3, [class*="author"], [class*="name"]')
      if (authorEl) {
        reviewItem.author = authorEl.textContent?.trim() || 'Guest'
      }
      
      // Extract date
      const containerText = container.textContent || ''
      const dateMatch = containerText.match(/(\w+\s+\d{4}|\d+\s+(day|week|month|year)s?\s+ago)/i)
      if (dateMatch) {
        reviewItem.date = dateMatch[0]
      }
      
      // Extract review text
      const textElements = container.querySelectorAll('span[dir="ltr"], div[dir="ltr"], p')
      let reviewText = ''
      
      textElements.forEach(el => {
        const text = el.textContent?.trim() || ''
        if (text.length > reviewText.length && 
            !text.includes(reviewItem.author) && 
            !text.includes(reviewItem.date) &&
            !text.match(/Show (more|less)/i)) {
          reviewText = text
        }
      })
      
      reviewItem.text = reviewText
      
      // Try to extract individual review rating if available
      const ratingEl = container.querySelector('[aria-label*="rating"], [class*="rating"]')
      if (ratingEl) {
        const ratingText = ratingEl.getAttribute('aria-label') || ratingEl.textContent || ''
        const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*(star|out of)/i)
        if (ratingMatch) {
          reviewItem.rating = parseFloat(ratingMatch[1])
        }
      }
      
      if (reviewItem.text && reviewItem.text.length > 20) {
        data.reviews.push(reviewItem)
      }
    })
    
    // If no reviews found with specific selectors, try broader approach
    if (data.reviews.length === 0) {
      const allDivs = modal.querySelectorAll('div')
      const potentialReviews: any[] = []
      
      allDivs.forEach(div => {
        const text = div.textContent?.trim() || ''
        if (text.length > 100 && text.length < 2000 &&
            text.match(/stayed|visit|place|host|room|location|clean/i)) {
          
          const childDivs = div.querySelectorAll('div')
          if (childDivs.length < 10) {
            const dateMatch = text.match(/(\w+\s+\d{4}|\d+\s+(day|week|month|year)s?\s+ago)/i)
            potentialReviews.push({
              author: 'Guest',
              date: dateMatch ? dateMatch[0] : '',
              text: text.substring(0, 500)
            })
          }
        }
      })
      
      // Deduplicate
      potentialReviews.forEach(review => {
        if (!data.reviews.some((r: any) => r.text === review.text)) {
          data.reviews.push(review)
        }
      })
    }
    
    return data
  })
  
  if (extractedData) {
    reviewData.overallRating = extractedData.overallRating || 0
    reviewData.totalCount = extractedData.totalCount || 0
    
    // Set distribution
    if (extractedData.distribution) {
      for (let stars = 5; stars >= 1; stars--) {
        reviewData.distribution[stars as keyof ReviewDistribution] = extractedData.distribution[stars] || 0
      }
    }
    
    // Set categories
    if (extractedData.categories) {
      Object.keys(extractedData.categories).forEach(key => {
        if (key in reviewData.categories) {
          reviewData.categories[key as keyof ReviewCategories] = extractedData.categories[key] || 0
        }
      })
    }
    
    // Set reviews
    reviewData.reviews = extractedData.reviews || []
  }
  
  console.log('Enhanced review extraction complete:', {
    overallRating: reviewData.overallRating,
    totalCount: reviewData.totalCount,
    distributionFound: Object.values(reviewData.distribution).some(v => v > 0),
    categoriesFound: Object.values(reviewData.categories).some(v => v > 0),
    reviewsFound: reviewData.reviews.length
  })
  
  return reviewData
}

// Extract reviews with scrolling for pagination
export async function extractAllReviewsWithScroll(page: Page, maxScrolls: number = 20): Promise<EnhancedReviewData> {
  const reviewData = await extractEnhancedReviews(page)
  const allReviews = [...reviewData.reviews]
  
  let previousReviewCount = 0
  let currentReviewCount = allReviews.length
  let scrollAttempts = 0
  
  // Scroll to load more reviews
  while (currentReviewCount > previousReviewCount && scrollAttempts < maxScrolls) {
    previousReviewCount = currentReviewCount
    
    // Scroll the modal
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
      if (!modal) return
      
      // Find scrollable container
      const scrollables = modal.querySelectorAll('[style*="overflow"], [class*="scroll"]')
      let scrollContainer = modal
      
      for (const el of scrollables) {
        const style = window.getComputedStyle(el)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollContainer = el
          break
        }
      }
      
      scrollContainer.scrollBy(0, 500)
    })
    
    // Wait for new content
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Extract new reviews
    const newData = await extractEnhancedReviews(page)
    
    // Merge new reviews
    newData.reviews.forEach(newReview => {
      const isDuplicate = allReviews.some(r => 
        r.text === newReview.text || 
        (r.author === newReview.author && r.date === newReview.date)
      )
      if (!isDuplicate) {
        allReviews.push(newReview)
      }
    })
    
    currentReviewCount = allReviews.length
    scrollAttempts++
    
    console.log(`Scroll attempt ${scrollAttempts}: ${currentReviewCount} total reviews`)
  }
  
  // Update the review data with all collected reviews
  reviewData.reviews = allReviews
  
  return reviewData
}