#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

// Load environment variables
config({ path: resolve(__dirname, '.env.local') })

async function debugNewListing() {
  const url = 'https://www.airbnb.com/rooms/1265375125128052388?check_in=2025-09-16&check_out=2025-09-30'
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY not configured')
  }
  
  console.log('🔍 Debugging New Listing Reviews')
  console.log(`📍 URL: ${url}`)
  console.log('=' .repeat(80))
  
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  const functionCode = `
export default async function({ page }) {
  const result = {
    mainPageInfo: {},
    reviewsModalInfo: {},
    screenshots: [],
    logs: [],
    error: null
  };
  
  try {
    const wait = async (ms) => {
      await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), ms);
    };
    
    // Navigate
    result.logs.push('Navigating to page...');
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    await wait(3000);
    
    // Dismiss modals
    await page.keyboard.press('Escape');
    await wait(500);
    
    // Find review info on main page
    result.mainPageInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      
      // Look for review count patterns
      const patterns = [
        /(\\d+)\\s+reviews?/i,
        /★\\s*(\\d+\\.\\d+)\\s*·\\s*(\\d+)\\s+reviews?/i,
        /(\\d+)\\s+Reviews?/i
      ];
      
      const matches = [];
      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match) {
          matches.push({
            pattern: pattern.toString(),
            match: match[0],
            count: match[2] || match[1]
          });
        }
      }
      
      // Also look for review buttons
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewButtons = buttons.filter(b => {
        const text = b.innerText || '';
        return text.match(/\\d+\\s+review/i);
      }).map(b => b.innerText);
      
      // Look for review links
      const links = Array.from(document.querySelectorAll('a'));
      const reviewLinks = links.filter(a => {
        const href = a.href || '';
        const text = a.innerText || '';
        return href.includes('/reviews') || text.match(/\\d+\\s+review/i);
      }).map(a => ({
        text: a.innerText,
        href: a.href
      }));
      
      return {
        matches,
        reviewButtons,
        reviewLinks,
        firstReviewFound: allText.substring(allText.indexOf('review'), allText.indexOf('review') + 100)
      };
    });
    
    result.logs.push('Main page review info: ' + JSON.stringify(result.mainPageInfo));
    
    // Take screenshot of main page
    const mainScreenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      encoding: 'base64',
      fullPage: false
    });
    result.screenshots.push({ name: 'main', data: mainScreenshot });
    
    // Try to find and click reviews
    const reviewsClicked = await page.evaluate(() => {
      // Method 1: Look for review count link
      const links = Array.from(document.querySelectorAll('a'));
      const reviewLink = links.find(a => {
        const text = a.innerText || '';
        return text.match(/\\d+\\s+reviews?/i);
      });
      
      if (reviewLink) {
        reviewLink.click();
        return { method: 'link', text: reviewLink.innerText };
      }
      
      // Method 2: Look for button with review count
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewButton = buttons.find(b => {
        const text = b.innerText || '';
        return text.match(/\\d+\\s+reviews?/i) || text.includes('Show all reviews');
      });
      
      if (reviewButton) {
        reviewButton.click();
        return { method: 'button', text: reviewButton.innerText };
      }
      
      // Method 3: Click on review section
      const reviewSection = document.querySelector('[data-section-id*="REVIEWS"], [id*="reviews"]');
      if (reviewSection) {
        const clickable = reviewSection.querySelector('a, button');
        if (clickable) {
          clickable.click();
          return { method: 'section', element: clickable.tagName };
        }
      }
      
      return { method: 'none' };
    });
    
    result.logs.push('Review click attempt: ' + JSON.stringify(reviewsClicked));
    
    if (reviewsClicked.method !== 'none') {
      await wait(3000);
      
      // Check if modal opened
      result.reviewsModalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return { exists: false };
        
        const modalText = modal.innerText || '';
        
        // Count review items in modal
        const reviewItems = modal.querySelectorAll('[data-review-id], [role="article"]');
        
        // Look for review containers with specific patterns
        const divs = Array.from(modal.querySelectorAll('div'));
        const potentialReviews = divs.filter(div => {
          const text = div.innerText || '';
          return text.includes('Stayed') || (text.includes('ago') && text.includes('star'));
        });
        
        return {
          exists: true,
          firstLine: modalText.substring(0, 200),
          reviewItemsCount: reviewItems.length,
          potentialReviewsCount: potentialReviews.length,
          hasOverallRating: modalText.includes('Overall rating'),
          totalReviewsText: modalText.match(/(\\d+)\\s+reviews?/i)?.[0],
          modalHeight: modal.offsetHeight,
          scrollHeight: modal.scrollHeight
        };
      });
      
      result.logs.push('Modal info: ' + JSON.stringify(result.reviewsModalInfo));
      
      // Take screenshot of modal
      const modalScreenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        encoding: 'base64',
        fullPage: false
      });
      result.screenshots.push({ name: 'modal', data: modalScreenshot });
      
      // Try to extract some reviews
      const sampleReviews = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return [];
        
        const reviews = [];
        const allDivs = Array.from(modal.querySelectorAll('div'));
        
        // Look for divs that contain review-like content
        allDivs.forEach(div => {
          const text = div.innerText || '';
          const lines = text.split('\\n').filter(l => l.trim());
          
          // Basic heuristic: has name, date/location, and review text
          if (lines.length >= 3 && lines.length < 20) {
            const hasDate = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December|ago|\\d{4})/i);
            const hasRating = text.includes('star') || text.includes('Rating');
            
            if (hasDate && hasRating) {
              reviews.push({
                lines: lines.slice(0, 5), // First 5 lines
                fullText: text.substring(0, 300)
              });
            }
          }
        });
        
        return reviews.slice(0, 3); // Return first 3 for debugging
      });
      
      result.logs.push('Sample reviews found: ' + sampleReviews.length);
      result.sampleReviews = sampleReviews;
    }
    
  } catch (error) {
    result.error = error.message;
    result.logs.push('Error: ' + error.message);
  }
  
  return {
    data: result,
    type: 'application/json'
  };
}
  `.trim()
  
  try {
    console.log('📸 Debugging new listing...')
    
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
    const data = result.data
    
    console.log('\n📋 Debug Logs:')
    data.logs?.forEach((log: string) => console.log(`  - ${log}`))
    
    console.log('\n📊 Main Page Review Info:')
    console.log('  Matches found:', data.mainPageInfo?.matches)
    console.log('  Review buttons:', data.mainPageInfo?.reviewButtons)
    console.log('  Review links:', data.mainPageInfo?.reviewLinks)
    
    if (data.reviewsModalInfo?.exists) {
      console.log('\n🪟 Modal Info:')
      console.log('  Modal opened: Yes')
      console.log('  Review items count:', data.reviewsModalInfo.reviewItemsCount)
      console.log('  Potential reviews:', data.reviewsModalInfo.potentialReviewsCount)
      console.log('  Total reviews text:', data.reviewsModalInfo.totalReviewsText)
      console.log('  Modal height:', data.reviewsModalInfo.modalHeight)
      console.log('  Scroll height:', data.reviewsModalInfo.scrollHeight)
      
      if (data.sampleReviews?.length > 0) {
        console.log('\n💬 Sample Reviews:')
        data.sampleReviews.forEach((review: any, i: number) => {
          console.log(`\n  Review ${i + 1}:`)
          console.log('  Lines:', review.lines)
        })
      }
    } else {
      console.log('\n🪟 Modal Info: Modal did not open')
    }
    
    // Save screenshots
    if (data.screenshots?.length > 0) {
      console.log(`\n💾 Saving ${data.screenshots.length} screenshots...`)
      data.screenshots.forEach((screenshot: any) => {
        const buffer = Buffer.from(screenshot.data, 'base64')
        const filename = `debug-${screenshot.name}.jpg`
        writeFileSync(filename, buffer)
        console.log(`  - ${filename} saved`)
      })
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('✅ Debug complete')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run debug
debugNewListing().catch(console.error)