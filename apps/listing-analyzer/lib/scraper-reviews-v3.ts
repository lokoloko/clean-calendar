// Review Modal Scraper V3 - Two-column layout with right-side scrolling
// This version targets the right column that contains the actual reviews

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

export async function scrapeReviewsV3(url: string): Promise<ReviewsResult> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  console.log('🎯 Starting Review Scraper V3 (Two-Column Layout)')
  
  try {
    // Step 1: Open modal and capture screenshots focusing on right column
    const captureResult = await captureReviewModalV3(url, apiKey)
    
    if (!captureResult.success) {
      throw new Error('Failed to capture reviews: ' + captureResult.error)
    }
    
    console.log(`📸 Captured ${captureResult.screenshots.length} screenshots`)
    console.log(`📍 Modal layout: ${captureResult.modalLayout}`)
    
    // Step 2: Extract ratings from first screenshot (left column)
    let ratingSummary = null
    if (captureResult.screenshots.length > 0) {
      console.log('🎯 Extracting ratings from left column...')
      ratingSummary = await extractRatingsFromScreenshot(captureResult.screenshots[0], geminiKey)
      if (ratingSummary) {
        console.log(`  ✅ Rating: ${ratingSummary.overallRating}, Reviews: ${ratingSummary.totalReviews}`)
      }
    }
    
    // Step 3: Extract individual reviews from screenshots (right column)
    const allReviews: ReviewData[] = []
    const seenReviews = new Set<string>()
    
    for (let i = 0; i < captureResult.screenshots.length; i++) {
      console.log(`🤖 Analyzing screenshot ${i + 1}/${captureResult.screenshots.length}...`)
      
      // For two-column layout, tell the AI to focus on the right side
      const isRightColumn = captureResult.modalLayout === 'two-column' && i > 0
      
      const reviews = await extractReviewsFromRightColumn(
        captureResult.screenshots[i],
        geminiKey,
        i,
        isRightColumn
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

async function captureReviewModalV3(url: string, apiKey: string): Promise<any> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  const functionCode = `
export default async function({ page }) {
  const result = {
    success: false,
    screenshots: [],
    totalCount: 0,
    modalLayout: 'unknown',
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
    
    // Find and click reviews
    const reviewsClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const showAllBtn = buttons.find(b => 
        b.innerText && b.innerText.match(/Show all \\d+ reviews/i)
      );
      if (showAllBtn) {
        showAllBtn.click();
        return { clicked: true, text: showAllBtn.innerText };
      }
      
      // Fallback to any review button
      const reviewBtn = buttons.find(b => 
        b.innerText && b.innerText.match(/\\d+ reviews?/i)
      );
      if (reviewBtn) {
        reviewBtn.click();
        return { clicked: true, text: reviewBtn.innerText };
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
    
    // Analyze modal structure - check for two-column layout
    const modalAnalysis = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { hasModal: false };
      
      // Look for column structure
      const allDivs = Array.from(modal.querySelectorAll('div'));
      
      // Check for flex or grid layout suggesting columns
      let hasColumns = false;
      let leftColumn = null;
      let rightColumn = null;
      
      for (const div of allDivs) {
        const style = window.getComputedStyle(div);
        
        // Check for flex container with row direction
        if (style.display === 'flex' && 
            (style.flexDirection === 'row' || !style.flexDirection)) {
          const children = Array.from(div.children);
          if (children.length === 2) {
            // Likely found the two-column container
            const firstChildText = children[0].innerText || '';
            const secondChildText = children[1].innerText || '';
            
            // Left column usually has "Overall rating" or category ratings
            if (firstChildText.includes('rating') || 
                firstChildText.includes('Cleanliness')) {
              leftColumn = children[0];
              rightColumn = children[1];
              hasColumns = true;
              break;
            }
          }
        }
        
        // Check for grid layout
        if (style.display === 'grid' && style.gridTemplateColumns) {
          const children = Array.from(div.children);
          if (children.length >= 2) {
            leftColumn = children[0];
            rightColumn = children[1];
            hasColumns = true;
            break;
          }
        }
      }
      
      // If we found columns, check if right column is scrollable
      let rightColumnScrollable = false;
      let rightColumnSelector = null;
      
      if (rightColumn) {
        // Check if right column or its children are scrollable
        const checkScrollable = (element) => {
          const style = window.getComputedStyle(element);
          return (style.overflowY === 'auto' || style.overflowY === 'scroll') ||
                 element.scrollHeight > element.clientHeight;
        };
        
        if (checkScrollable(rightColumn)) {
          rightColumnScrollable = true;
          rightColumn.setAttribute('data-review-scroll-target', 'true');
          rightColumnSelector = '[data-review-scroll-target="true"]';
        } else {
          // Check children of right column
          const rightChildren = rightColumn.querySelectorAll('*');
          for (const child of rightChildren) {
            if (checkScrollable(child)) {
              rightColumnScrollable = true;
              child.setAttribute('data-review-scroll-target', 'true');
              rightColumnSelector = '[data-review-scroll-target="true"]';
              break;
            }
          }
        }
      }
      
      const modalText = modal.innerText || '';
      const hasRatings = modalText.includes('Overall rating') || 
                        modalText.includes('Cleanliness');
      const reviewCount = modalText.match(/(\\d+) reviews?/i);
      
      return {
        hasModal: true,
        hasColumns: hasColumns,
        rightColumnScrollable: rightColumnScrollable,
        rightColumnSelector: rightColumnSelector,
        hasRatings: hasRatings,
        reviewCount: reviewCount ? parseInt(reviewCount[1]) : 0,
        modalWidth: modal.offsetWidth,
        modalHeight: modal.offsetHeight
      };
    });
    
    result.logs.push('Modal analysis: ' + JSON.stringify(modalAnalysis));
    
    if (!modalAnalysis.hasModal) {
      result.error = 'Modal did not open';
      return result;
    }
    
    result.modalLayout = modalAnalysis.hasColumns ? 'two-column' : 'single-column';
    result.totalCount = modalAnalysis.reviewCount;
    
    // Take first screenshot of the full modal
    const firstScreenshot = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      encoding: 'base64',
      fullPage: false
    });
    result.screenshots.push(firstScreenshot);
    result.logs.push('Captured full modal screenshot');
    
    // Now focus on scrolling the right column if it exists
    if (modalAnalysis.hasColumns && modalAnalysis.rightColumnScrollable) {
      result.logs.push('Two-column layout detected, scrolling right column');
      
      // Scroll the right column and capture screenshots
      let scrollCount = 0;
      const maxScrolls = 10;
      let lastScrollTop = -1;
      let noProgressCount = 0;
      
      while (scrollCount < maxScrolls && noProgressCount < 2) {
        // Scroll the right column
        const scrollResult = await page.evaluate((selector) => {
          const scrollTarget = document.querySelector(selector);
          if (!scrollTarget) {
            // Fallback: try to find any scrollable element on the right side
            const modal = document.querySelector('[role="dialog"]');
            if (!modal) return { scrolled: false };
            
            const allElements = Array.from(modal.querySelectorAll('*'));
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              // Check if element is on the right side of modal
              if (rect.left > modal.offsetWidth / 2) {
                if (el.scrollHeight > el.clientHeight) {
                  const before = el.scrollTop;
                  el.scrollBy(0, 500);
                  if (el.scrollTop > before) {
                    return { 
                      scrolled: true, 
                      scrollTop: el.scrollTop,
                      scrollHeight: el.scrollHeight,
                      clientHeight: el.clientHeight
                    };
                  }
                }
              }
            }
            return { scrolled: false };
          }
          
          const before = scrollTarget.scrollTop;
          scrollTarget.scrollBy(0, 500);
          const after = scrollTarget.scrollTop;
          
          return {
            scrolled: after > before,
            scrollTop: after,
            scrollHeight: scrollTarget.scrollHeight,
            clientHeight: scrollTarget.clientHeight,
            atBottom: after + scrollTarget.clientHeight >= scrollTarget.scrollHeight - 10
          };
        }, modalAnalysis.rightColumnSelector);
        
        result.logs.push('Scroll ' + (scrollCount + 1) + ': ' + JSON.stringify(scrollResult));
        
        if (scrollResult.scrollTop === lastScrollTop) {
          noProgressCount++;
        } else {
          noProgressCount = 0;
        }
        lastScrollTop = scrollResult.scrollTop;
        
        if (scrollResult.atBottom) {
          result.logs.push('Reached bottom of reviews');
          break;
        }
        
        if (!scrollResult.scrolled && noProgressCount >= 2) {
          result.logs.push('No more scrolling possible');
          break;
        }
        
        await wait(1500);
        
        // Take screenshot after scroll
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 85,
          encoding: 'base64',
          fullPage: false
        });
        result.screenshots.push(screenshot);
        scrollCount++;
      }
      
      result.logs.push('Captured ' + result.screenshots.length + ' screenshots');
      
    } else {
      // Single column or unable to detect columns - try general scrolling
      result.logs.push('Single column or unable to detect column structure');
      
      // Take a few more screenshots with different scroll attempts
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('PageDown');
        await wait(1500);
        
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 85,
          encoding: 'base64',
          fullPage: false
        });
        result.screenshots.push(screenshot);
      }
    }
    
    result.success = true;
    
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

async function extractReviewsFromRightColumn(
  screenshot: string,
  geminiKey: string,
  index: number,
  focusRightSide: boolean
): Promise<ReviewData[]> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = focusRightSide ? `
This screenshot shows a TWO-COLUMN review modal layout:
- LEFT COLUMN: Rating summary and categories (ignore this)
- RIGHT COLUMN: Individual guest reviews (extract these)

Focus ONLY on the RIGHT SIDE of the image and extract all visible reviews.

For each review in the RIGHT COLUMN, extract:
1. Reviewer name
2. Location or time on Airbnb
3. Date of review
4. Review text
5. Stay duration if mentioned

Return as JSON:
{
  "reviews": [
    {
      "reviewer": "Name",
      "reviewerLocation": "Location",
      "date": "Date",
      "review": "Review text",
      "stayDuration": "Stay info"
    }
  ]
}

If no reviews visible in right column:
{
  "reviews": [],
  "note": "No reviews in right column"
}` : `
Extract ALL guest reviews from this screenshot.

Skip any rating summaries or category scores.
Focus on individual reviews with reviewer names and text.

For each review, extract:
1. Reviewer name
2. Location or time on Airbnb
3. Date of review
4. Review text
5. Stay duration if mentioned

Return as JSON:
{
  "reviews": [
    {
      "reviewer": "Name",
      "reviewerLocation": "Location",
      "date": "Date",
      "review": "Review text",
      "stayDuration": "Stay info"
    }
  ]
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