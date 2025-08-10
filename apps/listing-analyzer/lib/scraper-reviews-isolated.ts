// Isolated Review Scraper - Multi-Screenshot Approach
// This is a standalone module focused solely on extracting reviews
// It won't affect the main scraper functionality

import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractRatingsFromScreenshot } from './extract-ratings-only'

interface ReviewData {
  reviewer: string
  reviewerLocation?: string
  date: string
  rating: number
  review: string
  stayDuration?: string
  hostResponse?: string
}

interface ReviewsResult {
  reviews: ReviewData[]
  totalCount: number
  overallRating: number
  categoryRatings?: {
    cleanliness?: number
    accuracy?: number
    communication?: number
    location?: number
    checkIn?: number
    value?: number
  }
  screenshots: string[]
  logs: string[]
}

export async function scrapeReviewsIsolated(url: string): Promise<ReviewsResult> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  console.log('🎯 Starting isolated review extraction')
  
  try {
    // Step 1: Capture multiple screenshots of reviews modal
    const captureResult = await captureReviewScreenshots(url, apiKey)
    
    if (!captureResult.success) {
      throw new Error('Failed to capture review screenshots: ' + captureResult.error)
    }
    
    console.log(`📸 Captured ${captureResult.screenshots.length} review screenshots`)
    
    // Step 2: Extract ratings from the first screenshot (which has the rating summary)
    let ratingSummary = null
    if (captureResult.screenshots.length > 0) {
      console.log('🎯 Extracting rating summary from first screenshot...')
      ratingSummary = await extractRatingsFromScreenshot(captureResult.screenshots[0], geminiKey)
      
      if (ratingSummary) {
        console.log(`  ✅ Overall rating: ${ratingSummary.overallRating}`)
        console.log(`  ✅ Total reviews: ${ratingSummary.totalReviews}`)
        console.log(`  ✅ Categories extracted: ${Object.values(ratingSummary.categoryRatings).filter(v => v > 0).length}`)
      }
    }
    
    // Step 3: Extract individual reviews from screenshots
    const allReviews: ReviewData[] = []
    const seenReviews = new Set<string>()
    
    for (let i = 0; i < captureResult.screenshots.length; i++) {
      console.log(`🤖 Extracting reviews from screenshot ${i + 1}/${captureResult.screenshots.length}...`)
      
      const extractedReviews = await extractReviewsFromScreenshot(
        captureResult.screenshots[i],
        geminiKey,
        i
      )
      
      // Deduplicate reviews
      for (const review of extractedReviews) {
        const reviewKey = `${review.reviewer}_${review.date}_${review.review.substring(0, 50)}`
        if (!seenReviews.has(reviewKey)) {
          seenReviews.add(reviewKey)
          allReviews.push(review)
        }
      }
    }
    
    console.log(`✅ Extracted ${allReviews.length} unique reviews`)
    
    return {
      reviews: allReviews,
      totalCount: ratingSummary?.totalReviews || captureResult.totalCount || allReviews.length,
      overallRating: ratingSummary?.overallRating || captureResult.overallRating || 0,
      categoryRatings: ratingSummary?.categoryRatings || captureResult.categoryRatings,
      screenshots: captureResult.screenshots,
      logs: captureResult.logs
    }
    
  } catch (error) {
    console.error('❌ Review extraction failed:', error)
    throw error
  }
}

async function captureReviewScreenshots(url: string, apiKey: string): Promise<any> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  const functionCode = `
export default async function({ page }) {
  const result = {
    success: false,
    screenshots: [],
    totalCount: 0,
    overallRating: 0,
    categoryRatings: {},
    logs: [],
    error: null
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
    
    // Find and click reviews button
    const reviewsClicked = await page.evaluate(() => {
      // Try "Show all X reviews" button first
      const buttons = Array.from(document.querySelectorAll('button'));
      const showAllBtn = buttons.find(b => {
        const text = b.innerText || '';
        return text.match(/Show all \\d+ reviews/i);
      });
      
      if (showAllBtn) {
        showAllBtn.click();
        return { clicked: true, method: 'show-all-button' };
      }
      
      // Try review count link
      const links = Array.from(document.querySelectorAll('a'));
      const reviewLink = links.find(a => {
        const text = a.innerText || '';
        return text.match(/\\d+ reviews?/i);
      });
      
      if (reviewLink) {
        reviewLink.click();
        return { clicked: true, method: 'review-link' };
      }
      
      // Try any button with review count
      const reviewBtn = buttons.find(b => {
        const text = b.innerText || '';
        return text.match(/\\d+ reviews?/i);
      });
      
      if (reviewBtn) {
        reviewBtn.click();
        return { clicked: true, method: 'review-button' };
      }
      
      return { clicked: false };
    });
    
    result.logs.push('Review button click: ' + JSON.stringify(reviewsClicked));
    
    if (!reviewsClicked.clicked) {
      result.error = 'Could not find reviews button';
      return result;
    }
    
    // Wait for modal to open and content to load
    await wait(4000);
    
    // Extract review summary information
    const summaryInfo = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;
      
      const modalText = modal.innerText || '';
      
      // Extract overall rating - look for the large rating number
      let overallRating = 0;
      
      // Try to find the rating in the modal
      const ratingPatterns = [
        /([\\d.]+)\\s*Guest favorite/i,
        /^\\s*([\\d.]+)\\s*$/m,  // Standalone number on its own line (like "4.86")
        /Overall rating.*?([\\d.]+)/i,
        /Rated\\s*([\\d.]+)/i,
        /([\\d.]+)\\s+out of 5/i
      ];
      
      for (const pattern of ratingPatterns) {
        const match = modalText.match(pattern);
        if (match) {
          const rating = parseFloat(match[1]);
          if (rating > 0 && rating <= 5) {
            overallRating = rating;
            break;
          }
        }
      }
      
      // Extract total count
      const countMatch = modalText.match(/(\\d+)\\s+reviews?/i);
      const totalCount = countMatch ? parseInt(countMatch[1]) : 0;
      
      // Extract category ratings
      const categories = {};
      const categoryNames = ['cleanliness', 'accuracy', 'check-in', 'communication', 'location', 'value'];
      
      categoryNames.forEach(name => {
        const pattern = new RegExp(name + '.*?([\\d.]+)', 'i');
        const match = modalText.match(pattern);
        if (match) {
          categories[name] = parseFloat(match[1]);
        }
      });
      
      return { overallRating, totalCount, categories };
    });
    
    if (summaryInfo) {
      result.overallRating = summaryInfo.overallRating;
      result.totalCount = summaryInfo.totalCount;
      result.categoryRatings = summaryInfo.categories;
      result.logs.push('Summary extracted: ' + JSON.stringify(summaryInfo));
    }
    
    // First, let's see if the page itself needs to scroll (reviews might be in a page modal, not a scrollable div)
    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { found: false };
      
      // Get the modal's actual position and size
      const rect = modal.getBoundingClientRect();
      
      return {
        found: true,
        modalHeight: rect.height,
        modalTop: rect.top,
        viewportHeight: window.innerHeight,
        // Check if modal fills the viewport (common for review modals)
        isFullscreen: rect.height >= window.innerHeight * 0.8
      };
    });
    
    result.logs.push('Modal info: ' + JSON.stringify(modalInfo));
    
    // If it's a fullscreen modal, we need to scroll the page, not a container
    const usePageScroll = modalInfo.isFullscreen;
    
    // Try to find scrollable container only if not using page scroll
    let scrollInfo = { found: false };
    
    if (!usePageScroll) {
      scrollInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return { found: false };
        
        let scrollContainer = null;
        
        // Look for divs with overflow that actually contain substantial content
        const allDivs = Array.from(modal.querySelectorAll('div'));
        for (const div of allDivs) {
          const style = window.getComputedStyle(div);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll')) {
            // Only consider containers with reasonable content height
            if (div.scrollHeight > 200 && div.scrollHeight > div.clientHeight) {
              scrollContainer = div;
              break;
            }
          }
        }
        
        if (scrollContainer) {
          scrollContainer.setAttribute('data-scroll-target', 'true');
          return {
            found: true,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
            canScroll: scrollContainer.scrollHeight > scrollContainer.clientHeight
          };
        }
        
        return { found: false };
      });
    }
    
    result.logs.push('Scroll container: ' + JSON.stringify(scrollInfo));
    
    // Take multiple screenshots while scrolling
    const maxScreenshots = 10;
    let screenshotCount = 0;
    let lastScrollPosition = -1;
    let noChangeCount = 0;
    
    while (screenshotCount < maxScreenshots && noChangeCount < 2) {
      // Take screenshot of current view
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        encoding: 'base64',
        fullPage: false
      });
      
      result.screenshots.push(screenshot);
      screenshotCount++;
      result.logs.push('Screenshot ' + screenshotCount + ' captured');
      
      // Try to scroll based on what type of modal we have
      const scrollResult = await page.evaluate((usePageScroll) => {
        if (usePageScroll) {
          // For fullscreen modals, scroll the page itself
          const before = window.pageYOffset;
          window.scrollBy(0, 600);
          const after = window.pageYOffset;
          
          return {
            scrolled: after > before,
            scrollPosition: after,
            scrollHeight: document.body.scrollHeight,
            atBottom: after + window.innerHeight >= document.body.scrollHeight - 10,
            method: 'page'
          };
        } else {
          // For contained modals, scroll within the modal
          const modal = document.querySelector('[role="dialog"]');
          if (!modal) return { scrolled: false };
          
          // Try to find our marked container first
          let scrollContainer = modal.querySelector('[data-scroll-target="true"]');
          
          // If not found, try the modal itself
          if (!scrollContainer) {
            // Try each parent of the modal to find scrollable one
            let parent = modal.parentElement;
            while (parent && parent !== document.body) {
              const style = window.getComputedStyle(parent);
              if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
                  parent.scrollHeight > parent.clientHeight) {
                scrollContainer = parent;
                break;
              }
              parent = parent.parentElement;
            }
          }
          
          // Last resort: try scrolling the modal itself
          if (!scrollContainer) {
            scrollContainer = modal;
          }
          
          const before = scrollContainer.scrollTop;
          scrollContainer.scrollBy(0, 600);
          const after = scrollContainer.scrollTop;
          
          return {
            scrolled: after > before,
            scrollPosition: after,
            scrollHeight: scrollContainer.scrollHeight,
            atBottom: after + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10,
            method: 'container'
          };
        }
      }, usePageScroll);
      
      result.logs.push('Scroll result: ' + JSON.stringify(scrollResult));
      
      // Check if we're making progress
      if (scrollResult.scrollPosition === lastScrollPosition) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
      }
      lastScrollPosition = scrollResult.scrollPosition;
      
      // Stop if we're at the bottom
      if (scrollResult.atBottom) {
        result.logs.push('Reached bottom of reviews');
        break;
      }
      
      // Wait for content to load after scroll
      await wait(2000);
    }
    
    result.success = true;
    result.logs.push('Captured ' + result.screenshots.length + ' screenshots total');
    
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

async function extractReviewsFromScreenshot(
  screenshot: string,
  geminiKey: string,
  index: number
): Promise<ReviewData[]> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `Extract ALL guest reviews from this screenshot of an Airbnb reviews modal.

For each review visible in the image, extract:
1. Reviewer name
2. Reviewer location (if shown)
3. Date of review or how long ago (e.g., "October 2024" or "2 weeks ago")
4. Rating (number of stars if shown)
5. The complete review text
6. Stay duration (e.g., "Stayed 3 nights")
7. Host response (if present)

IMPORTANT:
- Extract EVERY review you can see, even if partially visible
- Include reviews at the top and bottom edges of the screenshot
- If this is screenshot ${index + 1}, ignore the rating summary section and focus on individual reviews
- Look for patterns like profile pictures followed by names and review text

Return the data as a JSON array with this structure:
{
  "reviews": [
    {
      "reviewer": "Name",
      "reviewerLocation": "City, Country",
      "date": "October 2024",
      "rating": 5,
      "review": "Full review text here...",
      "stayDuration": "Stayed 3 nights",
      "hostResponse": "Response text if any"
    }
  ]
}

If no reviews are visible (only rating summary or other content), return:
{
  "reviews": []
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
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log(`  ⚠️ No JSON found in Vision AI response for screenshot ${index + 1}`)
      return []
    }
    
    const data = JSON.parse(jsonMatch[0])
    const reviews = data.reviews || []
    
    console.log(`  ✅ Extracted ${reviews.length} reviews from screenshot ${index + 1}`)
    
    return reviews.map((r: any) => ({
      reviewer: r.reviewer || 'Anonymous',
      reviewerLocation: r.reviewerLocation || '',
      date: r.date || '',
      rating: r.rating || 5,
      review: r.review || '',
      stayDuration: r.stayDuration || '',
      hostResponse: r.hostResponse || null
    }))
    
  } catch (error) {
    console.error(`  ❌ Failed to extract from screenshot ${index + 1}:`, error)
    return []
  }
}