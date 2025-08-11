#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

// Load environment variables
config({ path: resolve(__dirname, '.env.local') })

async function debugReviews() {
  const url = 'https://www.airbnb.com/rooms/1438491833009688203?check_in=2025-09-16&check_out=2025-09-30'
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY not configured')
  }
  
  console.log('🔍 Debugging Reviews Extraction')
  console.log(`📍 URL: ${url}`)
  console.log('=' .repeat(80))
  
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  // Function to debug reviews modal and scrolling
  const functionCode = `
export default async function({ page }) {
  const result = {
    reviewsData: null,
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
    
    // Find review count on main page
    const mainPageReviews = await page.evaluate(() => {
      // Look for review count
      const patterns = [
        /(\d+) reviews?/i,
        /(\d+) Reviews?/i
      ];
      
      const allText = document.body.innerText;
      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match) {
          return {
            count: parseInt(match[1]),
            text: match[0]
          };
        }
      }
      return null;
    });
    
    result.logs.push('Main page reviews: ' + JSON.stringify(mainPageReviews));
    
    // Find and click reviews button/link
    const reviewsClicked = await page.evaluate(() => {
      // Try multiple selectors
      const selectors = [
        'button[aria-label*="review"]',
        'a[href*="/reviews"]',
        'button:has-text("reviews")',
        '[data-testid*="review"]'
      ];
      
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            element.click();
            return { clicked: true, selector };
          }
        } catch (e) {}
      }
      
      // Try text-based search
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(a => {
        const href = a.href || '';
        const text = a.innerText || '';
        return href.includes('/reviews') || text.match(/\d+ review/i);
      });
      
      if (link) {
        link.click();
        return { clicked: true, text: link.innerText };
      }
      
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => {
        const text = b.innerText || '';
        const aria = b.getAttribute('aria-label') || '';
        return text.match(/\d+ review/i) || aria.includes('review');
      });
      
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      
      return { clicked: false };
    });
    
    result.logs.push('Reviews click result: ' + JSON.stringify(reviewsClicked));
    
    if (reviewsClicked.clicked) {
      await wait(3000);
      
      // Check if modal opened
      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return { exists: false };
        
        // Get modal dimensions
        const scrollContainer = modal.querySelector('[style*="overflow"]') || modal;
        
        return {
          exists: true,
          width: modal.offsetWidth,
          height: modal.offsetHeight,
          scrollHeight: scrollContainer.scrollHeight,
          clientHeight: scrollContainer.clientHeight,
          hasScroll: scrollContainer.scrollHeight > scrollContainer.clientHeight,
          firstLine: modal.innerText.substring(0, 100)
        };
      });
      
      result.logs.push('Modal info: ' + JSON.stringify(modalInfo));
      
      if (modalInfo.exists) {
        // Extract all reviews with scrolling
        const allReviews = [];
        const seenReviews = new Set();
        let scrollAttempts = 0;
        const maxScrolls = 10;
        let lastScrollHeight = 0;
        
        while (scrollAttempts < maxScrolls) {
          // Extract visible reviews
          const visibleReviews = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (!modal) return [];
            
            const reviews = [];
            
            // Strategy 1: Look for review containers
            const reviewContainers = modal.querySelectorAll('[data-review-id], [role="article"], div[aria-labelledby]');
            reviewContainers.forEach(container => {
              const text = container.innerText || '';
              const lines = text.split('\\n').filter(l => l.trim());
              
              if (lines.length >= 2) {
                // Typical pattern: Name, Date, Review text
                const name = lines[0];
                const date = lines[1];
                const reviewText = lines.slice(2).join(' ');
                
                if (reviewText && reviewText.length > 10) {
                  reviews.push({
                    name: name,
                    date: date,
                    text: reviewText,
                    method: 'container'
                  });
                }
              }
            });
            
            // Strategy 2: Pattern matching
            if (reviews.length === 0) {
              const allDivs = Array.from(modal.querySelectorAll('div'));
              
              allDivs.forEach(div => {
                const text = div.innerText || '';
                // Look for review patterns (name followed by date followed by text)
                if (text.length > 50 && text.length < 2000) {
                  const lines = text.split('\\n').filter(l => l.trim());
                  if (lines.length >= 2) {
                    const potentialName = lines[0];
                    const potentialDate = lines[1];
                    
                    // Check if it looks like a review
                    if (potentialDate.match(/(January|February|March|April|May|June|July|August|September|October|November|December|week|month|year|ago)/i)) {
                      reviews.push({
                        name: potentialName,
                        date: potentialDate,
                        text: lines.slice(2).join(' '),
                        method: 'pattern'
                      });
                    }
                  }
                }
              });
            }
            
            // Get scroll position
            const scrollContainer = modal.querySelector('[style*="overflow"]') || modal;
            return {
              reviews,
              scrollTop: scrollContainer.scrollTop,
              scrollHeight: scrollContainer.scrollHeight
            };
          });
          
          result.logs.push('Scroll ' + scrollAttempts + ': Found ' + visibleReviews.reviews.length + ' reviews');
          
          // Add new reviews
          visibleReviews.reviews.forEach(review => {
            const key = (review.name || '') + (review.date || '') + (review.text || '').substring(0, 50);
            if (!seenReviews.has(key) && review.text) {
              seenReviews.add(key);
              allReviews.push(review);
            }
          });
          
          // Take screenshot
          const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 80,
            encoding: 'base64',
            fullPage: false
          });
          result.screenshots.push(screenshot);
          
          // Check if we can scroll more
          if (visibleReviews.scrollHeight === lastScrollHeight) {
            result.logs.push('No more content to scroll');
            break;
          }
          lastScrollHeight = visibleReviews.scrollHeight;
          
          // Scroll down
          const scrolled = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (!modal) return false;
            
            const scrollContainer = modal.querySelector('[style*="overflow"]') || modal;
            const before = scrollContainer.scrollTop;
            
            // Try to find the scroll container more precisely
            const divs = modal.querySelectorAll('div');
            let actualScroller = scrollContainer;
            
            for (const div of divs) {
              const style = window.getComputedStyle(div);
              if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
                  div.scrollHeight > div.clientHeight) {
                actualScroller = div;
                break;
              }
            }
            
            actualScroller.scrollBy(0, 500);
            
            // Force scroll if needed
            if (actualScroller.scrollTop === before) {
              actualScroller.scrollTop = actualScroller.scrollTop + 500;
            }
            
            return {
              scrolled: actualScroller.scrollTop > before,
              scrollTop: actualScroller.scrollTop,
              scrollHeight: actualScroller.scrollHeight,
              clientHeight: actualScroller.clientHeight
            };
          });
          
          result.logs.push('Scroll result: ' + JSON.stringify(scrolled));
          
          if (!scrolled.scrolled) {
            result.logs.push('Could not scroll further');
            break;
          }
          
          // Wait for new content to load
          await wait(2000);
          scrollAttempts++;
        }
        
        result.reviewsData = {
          totalFound: allReviews.length,
          reviews: allReviews,
          scrollAttempts,
          uniqueReviews: seenReviews.size
        };
        
        // Also extract review summary if visible
        const summary = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          if (!modal) return null;
          
          // Look for rating and category scores
          const ratingEl = modal.querySelector('[class*="rating"], [aria-label*="rating"]');
          const categoriesContainer = modal.querySelector('[class*="categories"], [class*="scores"]');
          
          const categories = {};
          if (categoriesContainer) {
            const items = categoriesContainer.querySelectorAll('[class*="category"], [class*="score"]');
            items.forEach(item => {
              const text = item.innerText || '';
              const parts = text.split('\\n');
              if (parts.length >= 2) {
                const name = parts[0].toLowerCase();
                const score = parseFloat(parts[1]);
                if (!isNaN(score)) {
                  categories[name] = score;
                }
              }
            });
          }
          
          return {
            overallRating: ratingEl?.innerText,
            categories
          };
        });
        
        result.reviewsData.summary = summary;
      }
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
    console.log('📸 Capturing reviews modal with scrolling...')
    
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
    
    if (data.reviewsData) {
      console.log('\n📊 Reviews Extraction Results:')
      console.log(`Total reviews found: ${data.reviewsData.totalFound}`)
      console.log(`Unique reviews: ${data.reviewsData.uniqueReviews}`)
      console.log(`Scroll attempts: ${data.reviewsData.scrollAttempts}`)
      console.log(`Screenshots taken: ${data.screenshots?.length || 0}`)
      
      if (data.reviewsData.summary) {
        console.log('\n⭐ Review Summary:')
        console.log(`Overall rating: ${data.reviewsData.summary.overallRating}`)
        if (Object.keys(data.reviewsData.summary.categories).length > 0) {
          console.log('Category scores:', data.reviewsData.summary.categories)
        }
      }
      
      if (data.reviewsData.reviews?.length > 0) {
        console.log('\n💬 Extracted Reviews:')
        data.reviewsData.reviews.forEach((review: any, i: number) => {
          console.log(`\n${i + 1}. ${review.name || 'Anonymous'} - ${review.date || 'No date'}`)
          if (review.text) {
            console.log(`   "${review.text.substring(0, 150)}${review.text.length > 150 ? '...' : ''}"`)
          }
          if (review.method) {
            console.log(`   (Extracted via: ${review.method})`)
          }
        })
      }
      
      // Save reviews data
      writeFileSync('reviews-data.json', JSON.stringify(data.reviewsData, null, 2))
      console.log('\n💾 Reviews data saved to reviews-data.json')
    }
    
    // Save screenshots
    if (data.screenshots?.length > 0) {
      console.log(`\n💾 Saving ${data.screenshots.length} screenshots...`)
      data.screenshots.forEach((screenshot: string, i: number) => {
        const buffer = Buffer.from(screenshot, 'base64')
        writeFileSync(`reviews-screenshot-${i}.jpg`, buffer)
        console.log(`  - reviews-screenshot-${i}.jpg (${(screenshot.length / 1024).toFixed(1)}KB)`)
      })
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('🔍 Reviews Debug Complete')
    console.log('Check reviews-screenshot-*.jpg files to see what was captured')
    console.log('Check reviews-data.json for extracted review data')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run debug
debugReviews().catch(console.error)