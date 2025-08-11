import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

interface ScrollStrategy {
  name: string;
  execute: (page: puppeteer.Page) => Promise<any>;
}

async function advancedReviewScrolling() {
  console.log('🚀 Advanced Review Modal Scrolling Test\n');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_KEY}`,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Inject console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'log' && text.includes('SCROLL:')) {
        console.log('🔍', text);
      }
    });

    console.log('📱 Loading Airbnb listing...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Open review modal
    console.log('📝 Opening reviews modal...');
    const opened = await page.evaluate(() => {
      // Find and click the review button
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewButton = buttons.find(btn => {
        const label = btn.getAttribute('aria-label') || '';
        const text = btn.textContent || '';
        return label.toLowerCase().includes('review') || 
               label.toLowerCase().includes('rating') ||
               text.toLowerCase().includes('review');
      });
      
      if (reviewButton) {
        reviewButton.click();
        return true;
      }
      return false;
    });

    if (!opened) {
      console.log('❌ Could not open review modal');
      return;
    }

    console.log('⏳ Waiting for modal to fully load...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Strategy 1: Find container by structure analysis
    const strategy1: ScrollStrategy = {
      name: 'Structure Analysis',
      execute: async (page) => {
        return await page.evaluate(() => {
          console.log('SCROLL: Starting structure analysis...');
          
          // Find modal
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!modal) {
            console.log('SCROLL: No modal found');
            return { success: false, reason: 'No modal found' };
          }

          // Method 1: Look for section/div that contains review content
          const sections = modal.querySelectorAll('section, div');
          let reviewContainer = null;
          let maxReviews = 0;

          sections.forEach(section => {
            // Count review-like elements in this section
            const reviewCount = section.querySelectorAll('[data-review-id], [role="article"], div[class*="review"]').length;
            
            // Check if scrollable
            const isScrollable = (section as HTMLElement).scrollHeight > (section as HTMLElement).clientHeight;
            
            if (reviewCount > maxReviews && isScrollable) {
              maxReviews = reviewCount;
              reviewContainer = section as HTMLElement;
            }
          });

          if (reviewContainer) {
            console.log(`SCROLL: Found container with ${maxReviews} reviews`);
            const before = reviewContainer.scrollTop;
            reviewContainer.scrollTop = reviewContainer.scrollHeight;
            const after = reviewContainer.scrollTop;
            
            return {
              success: true,
              containerFound: true,
              scrolled: after > before,
              scrollDistance: after - before,
              reviewsInContainer: maxReviews
            };
          }

          return { success: false, reason: 'No scrollable review container found' };
        });
      }
    };

    // Strategy 2: Find by overflow styles
    const strategy2: ScrollStrategy = {
      name: 'Overflow Style Detection',
      execute: async (page) => {
        return await page.evaluate(() => {
          console.log('SCROLL: Checking overflow styles...');
          
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!modal) return { success: false };

          // Find all elements with scroll overflow
          const allElements = modal.querySelectorAll('*');
          const scrollables: HTMLElement[] = [];

          allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const hasScrollOverflow = 
              style.overflow === 'auto' || 
              style.overflow === 'scroll' || 
              style.overflowY === 'auto' || 
              style.overflowY === 'scroll';
            
            const isActuallyScrollable = 
              (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;

            if (hasScrollOverflow && isActuallyScrollable) {
              scrollables.push(el as HTMLElement);
            }
          });

          console.log(`SCROLL: Found ${scrollables.length} scrollable elements`);

          // Try scrolling each one
          const results: any[] = [];
          scrollables.forEach((container, index) => {
            const before = container.scrollTop;
            container.scrollTop += 500;
            const after = container.scrollTop;
            
            if (after > before) {
              results.push({
                index,
                scrolled: true,
                distance: after - before,
                totalHeight: container.scrollHeight,
                visibleHeight: container.clientHeight
              });
            }
          });

          return {
            success: results.length > 0,
            scrollableContainers: scrollables.length,
            successfulScrolls: results
          };
        });
      }
    };

    // Strategy 3: Use IntersectionObserver to detect lazy loading
    const strategy3: ScrollStrategy = {
      name: 'Lazy Load Detection',
      execute: async (page) => {
        return await page.evaluate(async () => {
          console.log('SCROLL: Setting up lazy load detection...');
          
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!modal) return { success: false };

          // Find the most likely scroll container
          let scrollContainer: HTMLElement | null = null;
          const candidates = modal.querySelectorAll('div, section');
          
          for (const candidate of Array.from(candidates)) {
            const el = candidate as HTMLElement;
            if (el.scrollHeight > el.clientHeight && el.scrollHeight > 1000) {
              scrollContainer = el;
              break;
            }
          }

          if (!scrollContainer) {
            console.log('SCROLL: No suitable scroll container found');
            return { success: false };
          }

          const results = {
            initialReviews: 0,
            finalReviews: 0,
            scrollSteps: [] as any[],
            containerInfo: {
              scrollHeight: scrollContainer.scrollHeight,
              clientHeight: scrollContainer.clientHeight,
              className: scrollContainer.className
            }
          };

          // Count initial reviews
          results.initialReviews = document.querySelectorAll('[data-review-id], [role="article"]').length;

          // Scroll incrementally
          const scrollStep = 300;
          const maxScrolls = Math.ceil(scrollContainer.scrollHeight / scrollStep);
          
          for (let i = 0; i < Math.min(maxScrolls, 20); i++) {
            const beforeScroll = scrollContainer.scrollTop;
            scrollContainer.scrollTop += scrollStep;
            
            // Wait for lazy loading
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const afterScroll = scrollContainer.scrollTop;
            const currentReviews = document.querySelectorAll('[data-review-id], [role="article"]').length;
            
            results.scrollSteps.push({
              step: i + 1,
              scrolledTo: afterScroll,
              reviewCount: currentReviews,
              actualScroll: afterScroll - beforeScroll
            });

            // Stop if we can't scroll anymore
            if (afterScroll === beforeScroll) {
              console.log('SCROLL: Reached bottom');
              break;
            }
          }

          results.finalReviews = document.querySelectorAll('[data-review-id], [role="article"]').length;
          
          return {
            success: true,
            ...results
          };
        });
      }
    };

    // Strategy 4: Direct element targeting
    const strategy4: ScrollStrategy = {
      name: 'Direct Element Targeting',
      execute: async (page) => {
        return await page.evaluate(async () => {
          console.log('SCROLL: Direct element targeting...');

          // Common Airbnb modal class patterns
          const selectors = [
            'div[class*="scroll"]',
            'div[style*="overflow"]',
            '[class*="modal-body"]',
            '[class*="content"]',
            'div[tabindex="-1"]'
          ];

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            
            for (const element of Array.from(elements)) {
              const el = element as HTMLElement;
              
              // Check if it's in a modal and scrollable
              const inModal = el.closest('[role="dialog"], [aria-modal="true"]');
              const isScrollable = el.scrollHeight > el.clientHeight;
              
              if (inModal && isScrollable) {
                console.log(`SCROLL: Found target with selector: ${selector}`);
                
                // Perform scrolling
                const scrollInfo = {
                  selector,
                  initialScrollTop: el.scrollTop,
                  scrollHeight: el.scrollHeight,
                  clientHeight: el.clientHeight,
                  scrollAttempts: [] as any[]
                };

                // Scroll in chunks
                for (let i = 0; i < 10; i++) {
                  const before = el.scrollTop;
                  el.scrollTop += 400;
                  await new Promise(resolve => setTimeout(resolve, 500));
                  const after = el.scrollTop;
                  
                  scrollInfo.scrollAttempts.push({
                    attempt: i + 1,
                    scrolled: after - before,
                    position: after
                  });

                  if (after === before) break; // Can't scroll further
                }

                return {
                  success: true,
                  ...scrollInfo
                };
              }
            }
          }

          return { success: false, reason: 'No suitable element found' };
        });
      }
    };

    // Execute all strategies
    const strategies = [strategy1, strategy2, strategy3, strategy4];
    
    for (const strategy of strategies) {
      console.log(`\n📊 Testing Strategy: ${strategy.name}`);
      console.log('━'.repeat(50));
      
      try {
        const result = await strategy.execute(page);
        console.log('Result:', JSON.stringify(result, null, 2));
        
        // Wait a bit between strategies
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset scroll position for next strategy
        await page.evaluate(() => {
          const scrollables = document.querySelectorAll('[role="dialog"] *');
          scrollables.forEach(el => {
            (el as HTMLElement).scrollTop = 0;
          });
        });
        
      } catch (error) {
        console.log('Strategy failed:', error);
      }
    }

    // Final extraction attempt
    console.log('\n📋 Final Review Extraction');
    console.log('━'.repeat(50));
    
    const extractedReviews = await page.evaluate(() => {
      const reviews: any[] = [];
      const reviewElements = document.querySelectorAll('[data-review-id], [role="article"], div[class*="review"]');
      
      reviewElements.forEach((element, index) => {
        const text = (element as HTMLElement).innerText || '';
        
        // Extract reviewer name if available
        const nameElement = element.querySelector('div[class*="name"], span[class*="name"], [class*="reviewer"]');
        const reviewerName = nameElement ? (nameElement as HTMLElement).innerText : 'Unknown';
        
        // Extract date if available
        const dateElement = element.querySelector('time, span[class*="date"], div[class*="date"]');
        const reviewDate = dateElement ? (dateElement as HTMLElement).innerText : '';
        
        if (text.length > 50) {
          reviews.push({
            index: index + 1,
            reviewer: reviewerName,
            date: reviewDate,
            preview: text.substring(0, 150) + '...',
            fullLength: text.length
          });
        }
      });
      
      return reviews;
    });

    console.log(`\n✅ Extracted ${extractedReviews.length} reviews\n`);
    
    if (extractedReviews.length > 0) {
      console.log('Sample reviews:');
      extractedReviews.slice(0, 3).forEach(review => {
        console.log(`\n  Review #${review.index}`);
        console.log(`  Reviewer: ${review.reviewer}`);
        console.log(`  Date: ${review.date}`);
        console.log(`  Text: ${review.preview}`);
      });
    }

    // Save results
    await fs.writeFile(
      'review-scroll-results.json', 
      JSON.stringify({ 
        reviewCount: extractedReviews.length,
        reviews: extractedReviews 
      }, null, 2)
    );
    
    console.log('\n💾 Results saved to review-scroll-results.json');

    // Take final screenshot
    const screenshot = await page.screenshot({ encoding: 'base64' });
    await fs.writeFile('review-modal-final.jpg', Buffer.from(screenshot, 'base64'));
    console.log('📸 Screenshot saved to review-modal-final.jpg');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n🏁 Test complete');
  }
}

// Run the test
advancedReviewScrolling().catch(console.error);