// Review Modal Scraper V2 - Improved scrolling to reach actual reviews
// This version focuses on getting past the rating section to the review content

import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractRatingsFromScreenshot } from './extract-ratings-only'

interface ReviewData {
  reviewer: string
  reviewerLocation?: string
  date: string
  rating?: number
  review: string
  stayDuration?: string
  hostResponse?: string
}

interface ReviewsResult {
  reviews: ReviewData[]
  totalCount: number
  overallRating: number
  categoryRatings?: any
  screenshots: string[]
  logs: string[]
  success: boolean
}

export async function scrapeReviewsV2(url: string): Promise<ReviewsResult> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  console.log('🎯 Starting Review Scraper V2 (Improved Scrolling)')
  
  try {
    // Step 1: Open modal and capture screenshots with better scrolling
    const captureResult = await captureReviewModalV2(url, apiKey)
    
    if (!captureResult.success) {
      throw new Error('Failed to capture reviews: ' + captureResult.error)
    }
    
    console.log(`📸 Captured ${captureResult.screenshots.length} screenshots`)
    
    // Step 2: Extract ratings from first screenshot
    let ratingSummary = null
    if (captureResult.screenshots.length > 0) {
      console.log('🎯 Extracting ratings from first screenshot...')
      ratingSummary = await extractRatingsFromScreenshot(captureResult.screenshots[0], geminiKey)
      if (ratingSummary) {
        console.log(`  ✅ Rating: ${ratingSummary.overallRating}, Reviews: ${ratingSummary.totalReviews}`)
      }
    }
    
    // Step 3: Extract individual reviews from all screenshots
    const allReviews: ReviewData[] = []
    const seenReviews = new Set<string>()
    
    for (let i = 0; i < captureResult.screenshots.length; i++) {
      console.log(`🤖 Analyzing screenshot ${i + 1}/${captureResult.screenshots.length}...`)
      
      // Skip first screenshot if it only has ratings (no reviews visible)
      if (i === 0 && captureResult.firstScreenshotHasOnlyRatings) {
        console.log('  ⏭️ Skipping rating-only screenshot')
        continue
      }
      
      const reviews = await extractReviewsFromScreenshotV2(
        captureResult.screenshots[i],
        geminiKey,
        i
      )
      
      // Deduplicate
      for (const review of reviews) {
        const key = `${review.reviewer}_${review.date}_${review.review.substring(0, 30)}`
        if (!seenReviews.has(key)) {
          seenReviews.add(key)
          allReviews.push(review)
        }
      }
    }
    
    console.log(`✅ Extracted ${allReviews.length} unique reviews`)
    
    return {
      reviews: allReviews,
      totalCount: ratingSummary?.totalReviews || captureResult.totalCount || 0,
      overallRating: ratingSummary?.overallRating || 0,
      categoryRatings: ratingSummary?.categoryRatings,
      screenshots: captureResult.screenshots,
      logs: captureResult.logs,
      success: true
    }
    
  } catch (error) {
    console.error('❌ Review extraction failed:', error)
    return {
      reviews: [],
      totalCount: 0,
      overallRating: 0,
      screenshots: [],
      logs: [`Error: ${error}`],
      success: false
    }
  }
}

async function captureReviewModalV2(url: string, apiKey: string): Promise<any> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  const functionCode = `
export default async function({ page }) {
  const result = {
    success: false,
    screenshots: [],
    totalCount: 0,
    logs: [],
    error: null,
    firstScreenshotHasOnlyRatings: false
  };
  
  try {
    const wait = async (ms) => {
      await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), ms);
    };
    
    // Navigate to page
    result.logs.push('Navigating to listing...');
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    await wait(3000);
    
    // Dismiss any initial modals
    await page.keyboard.press('Escape');
    await wait(500);
    
    // Find and click reviews - try multiple strategies
    const reviewsClicked = await page.evaluate(() => {
      // Strategy 1: "Show all X reviews" button
      const buttons = Array.from(document.querySelectorAll('button'));
      const showAllBtn = buttons.find(b => 
        b.innerText && b.innerText.match(/Show all \\d+ reviews/i)
      );
      if (showAllBtn) {
        showAllBtn.click();
        return { clicked: true, method: 'show-all', text: showAllBtn.innerText };
      }
      
      // Strategy 2: Review count text that's clickable
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        const text = el.innerText || '';
        if (text.match(/^\\d+ reviews?$/i) && 
            (el.tagName === 'BUTTON' || el.tagName === 'A' || 
             window.getComputedStyle(el).cursor === 'pointer')) {
          el.click();
          return { clicked: true, method: 'review-count', text: text };
        }
      }
      
      // Strategy 3: Any element with review count
      const reviewElements = elements.filter(el => {
        const text = el.innerText || '';
        return text.match(/\\d+ reviews?/i) && el.children.length < 3;
      });
      
      if (reviewElements.length > 0) {
        reviewElements[0].click();
        return { clicked: true, method: 'review-element', text: reviewElements[0].innerText };
      }
      
      return { clicked: false };
    });
    
    result.logs.push('Review click: ' + JSON.stringify(reviewsClicked));
    
    if (!reviewsClicked.clicked) {
      result.error = 'Could not find reviews button';
      return result;
    }
    
    // Wait for modal to fully load
    await wait(4000);
    
    // Check if modal opened and has the expected structure
    const modalCheck = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { hasModal: false };
      
      const modalText = modal.innerText || '';
      
      // Check for indicators that this is the reviews modal
      const hasRatings = modalText.includes('Overall rating') || 
                        modalText.includes('Cleanliness') ||
                        modalText.match(/\\d+\\.\\d+/);
      const hasReviewCount = modalText.match(/\\d+ reviews?/i);
      
      // Get modal dimensions
      const rect = modal.getBoundingClientRect();
      
      return {
        hasModal: true,
        hasRatings: hasRatings,
        hasReviewCount: hasReviewCount,
        modalHeight: rect.height,
        viewportHeight: window.innerHeight,
        isFullscreen: rect.height >= window.innerHeight * 0.8,
        firstWords: modalText.substring(0, 100)
      };
    });
    
    result.logs.push('Modal check: ' + JSON.stringify(modalCheck));
    
    if (!modalCheck.hasModal) {
      result.error = 'Modal did not open';
      return result;
    }
    
    // Take first screenshot (ratings section)
    const firstScreenshot = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      encoding: 'base64',
      fullPage: false
    });
    result.screenshots.push(firstScreenshot);
    result.logs.push('Captured ratings screenshot');
    
    // Check if reviews are visible or if we need to scroll
    const reviewsVisible = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return false;
      
      const modalText = modal.innerText || '';
      
      // Look for review indicators (names, dates, "Stayed", etc.)
      const hasReviewContent = modalText.includes('Stayed') || 
                               modalText.includes('ago') && modalText.includes('stars');
      
      return hasReviewContent;
    });
    
    result.firstScreenshotHasOnlyRatings = !reviewsVisible;
    result.logs.push('Reviews visible in first screenshot: ' + reviewsVisible);
    
    // Now we need to scroll to the reviews section
    // Try multiple scrolling strategies
    
    // Strategy 1: Scroll within the modal
    const scrollAttempt1 = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { scrolled: false };
      
      // Find scrollable container within modal
      let scrollContainer = null;
      const allDivs = Array.from(modal.querySelectorAll('div'));
      
      for (const div of allDivs) {
        const style = window.getComputedStyle(div);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
            div.scrollHeight > div.clientHeight) {
          scrollContainer = div;
          break;
        }
      }
      
      if (scrollContainer) {
        const before = scrollContainer.scrollTop;
        scrollContainer.scrollTop = scrollContainer.scrollHeight / 3; // Scroll 1/3 down
        return { 
          scrolled: scrollContainer.scrollTop > before,
          method: 'container',
          scrollTop: scrollContainer.scrollTop
        };
      }
      
      return { scrolled: false };
    });
    
    result.logs.push('Scroll attempt 1 (container): ' + JSON.stringify(scrollAttempt1));
    
    if (scrollAttempt1.scrolled) {
      await wait(1500);
    } else {
      // Strategy 2: Try page-level scroll
      const scrollAttempt2 = await page.evaluate(() => {
        const before = window.pageYOffset;
        window.scrollBy(0, 500);
        return {
          scrolled: window.pageYOffset > before,
          method: 'page',
          scrollTop: window.pageYOffset
        };
      });
      
      result.logs.push('Scroll attempt 2 (page): ' + JSON.stringify(scrollAttempt2));
      
      if (scrollAttempt2.scrolled) {
        await wait(1500);
      } else {
        // Strategy 3: Try using keyboard
        await page.keyboard.press('PageDown');
        await wait(1500);
        result.logs.push('Scroll attempt 3 (keyboard): PageDown');
      }
    }
    
    // Take screenshot after scrolling
    const screenshot2 = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      encoding: 'base64',
      fullPage: false
    });
    result.screenshots.push(screenshot2);
    result.logs.push('Captured post-scroll screenshot');
    
    // Continue scrolling and capturing
    const maxScreenshots = 8;
    let lastScrollPosition = -1;
    let noProgressCount = 0;
    
    while (result.screenshots.length < maxScreenshots && noProgressCount < 2) {
      // Try to scroll more
      const scrollResult = await page.evaluate(() => {
        // Try modal container first
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return { scrolled: false };
        
        let scrolled = false;
        let scrollPosition = 0;
        
        // Find any scrollable element
        const elements = [modal, ...Array.from(modal.querySelectorAll('*'))];
        for (const el of elements) {
          if (el.scrollHeight > el.clientHeight) {
            const before = el.scrollTop;
            el.scrollBy(0, 400);
            if (el.scrollTop > before) {
              scrolled = true;
              scrollPosition = el.scrollTop;
              break;
            }
          }
        }
        
        // Fallback to page scroll
        if (!scrolled) {
          const before = window.pageYOffset;
          window.scrollBy(0, 400);
          scrolled = window.pageYOffset > before;
          scrollPosition = window.pageYOffset;
        }
        
        return { scrolled, scrollPosition };
      });
      
      if (scrollResult.scrollPosition === lastScrollPosition) {
        noProgressCount++;
      } else {
        noProgressCount = 0;
      }
      lastScrollPosition = scrollResult.scrollPosition;
      
      if (!scrollResult.scrolled && noProgressCount >= 2) {
        result.logs.push('No more scrolling possible');
        break;
      }
      
      await wait(1500);
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        encoding: 'base64',
        fullPage: false
      });
      result.screenshots.push(screenshot);
      result.logs.push('Screenshot ' + result.screenshots.length + ' captured');
    }
    
    result.success = true;
    result.logs.push('Total screenshots: ' + result.screenshots.length);
    
  } catch (error) {
    result.error = error.message;
    result.logs.push('Error: ' + error.message);
  }
  
  return result;
}
  `.trim()
  
  const response = await fetch(functionEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: functionCode,
      context: {}
    })
  })
  
  if (!response.ok) {
    throw new Error(`Function API failed: ${response.statusText}`)
  }
  
  const result = await response.json()
  return result
}

async function extractReviewsFromScreenshotV2(
  screenshot: string,
  geminiKey: string,
  index: number
): Promise<ReviewData[]> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `Extract ALL individual guest reviews from this Airbnb modal screenshot.

IMPORTANT: 
- Look for actual review content, not just ratings
- Reviews typically have: reviewer name, date/location, and review text
- Skip the rating summary section (with category scores)
- Extract every review visible, even partially visible ones

For each review found, extract:
1. Reviewer name (e.g., "John", "Sarah M")
2. Reviewer location OR time on Airbnb (e.g., "Los Angeles, CA" or "2 years on Airbnb")
3. Date (e.g., "October 2024", "2 weeks ago", "Last month")
4. Review text (the actual review content)
5. Stay duration if mentioned (e.g., "Stayed 3 nights")

Return as JSON:
{
  "reviews": [
    {
      "reviewer": "Name",
      "reviewerLocation": "Location or time on platform",
      "date": "When reviewed",
      "review": "The full review text",
      "stayDuration": "How long they stayed"
    }
  ]
}

If this screenshot only shows ratings/categories (no actual reviews), return:
{
  "reviews": [],
  "note": "Only ratings visible, no reviews"
}`
  
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
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      console.log(`  ⚠️ No JSON in response for screenshot ${index + 1}`)
      return []
    }
    
    const data = JSON.parse(jsonMatch[0])
    
    if (data.note) {
      console.log(`  ℹ️ Screenshot ${index + 1}: ${data.note}`)
    }
    
    const reviews = data.reviews || []
    console.log(`  ✅ Found ${reviews.length} reviews in screenshot ${index + 1}`)
    
    return reviews.map((r: any) => ({
      reviewer: r.reviewer || 'Anonymous',
      reviewerLocation: r.reviewerLocation || '',
      date: r.date || '',
      rating: r.rating,
      review: r.review || '',
      stayDuration: r.stayDuration || '',
      hostResponse: r.hostResponse
    }))
    
  } catch (error) {
    console.error(`  ❌ Failed to extract from screenshot ${index + 1}:`, error)
    return []
  }
}