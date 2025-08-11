import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

async function debugReviewModalScrolling() {
  console.log('🔍 Starting Review Modal Scroll Debug...\n');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_KEY}`,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('PAGE LOG:', msg.text());
      }
    });

    console.log('📱 Loading listing page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find and click the reviews button
    console.log('🔍 Looking for reviews button...');
    const reviewButtonSelectors = [
      'button[aria-label*="Rated"]',
      'button[aria-label*="rating"]',
      'button[aria-label*="review"]',
      'button:has-text("reviews")',
      '[data-testid*="review"]',
      'button span:has-text("reviews")',
    ];

    let clicked = false;
    for (const selector of reviewButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          clicked = true;
          console.log(`✅ Clicked review button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      // Try finding by text content
      const reviewButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const reviewBtn = buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('review') ||
          btn.getAttribute('aria-label')?.toLowerCase().includes('review') ||
          btn.getAttribute('aria-label')?.toLowerCase().includes('rating')
        );
        if (reviewBtn) {
          reviewBtn.click();
          return true;
        }
        return false;
      });
      
      if (reviewButton) {
        console.log('✅ Clicked review button via text search');
      } else {
        console.log('❌ Could not find review button');
        return;
      }
    }

    // Wait for modal to appear
    console.log('⏳ Waiting for modal to open...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Debug: Log all potential scrollable containers
    console.log('\n📊 Analyzing modal structure...');
    const modalInfo = await page.evaluate(() => {
      const results: any = {
        containers: [],
        reviewsFound: 0,
        modalFound: false
      };

      // Find modal containers
      const modalSelectors = [
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[data-testid="modal"]',
        '.ReactModal__Content',
        '[class*="modal"]',
        '[class*="Modal"]'
      ];

      for (const selector of modalSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          results.modalFound = true;
          const rect = element.getBoundingClientRect();
          results.containers.push({
            selector,
            scrollHeight: (element as HTMLElement).scrollHeight,
            clientHeight: (element as HTMLElement).clientHeight,
            isScrollable: (element as HTMLElement).scrollHeight > (element as HTMLElement).clientHeight,
            overflow: window.getComputedStyle(element).overflow,
            overflowY: window.getComputedStyle(element).overflowY,
            position: `${rect.top}, ${rect.left}, ${rect.width}x${rect.height}`
          });
        }
      }

      // Find divs that might be scrollable containers
      const divs = document.querySelectorAll('div');
      divs.forEach((div) => {
        const style = window.getComputedStyle(div);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          const rect = div.getBoundingClientRect();
          if (rect.height > 100 && div.scrollHeight > div.clientHeight) {
            results.containers.push({
              selector: `div with class: ${div.className.substring(0, 50)}...`,
              scrollHeight: div.scrollHeight,
              clientHeight: div.clientHeight,
              isScrollable: true,
              overflow: style.overflow,
              overflowY: style.overflowY,
              position: `${rect.top}, ${rect.left}, ${rect.width}x${rect.height}`
            });
          }
        }
      });

      // Count review elements
      const reviewSelectors = [
        '[data-review-id]',
        '[class*="review-item"]',
        '[class*="ReviewItem"]',
        '[role="article"]',
        'div[aria-label*="review"]'
      ];

      for (const selector of reviewSelectors) {
        const reviews = document.querySelectorAll(selector);
        if (reviews.length > 0) {
          results.reviewsFound = Math.max(results.reviewsFound, reviews.length);
        }
      }

      return results;
    });

    console.log('Modal found:', modalInfo.modalFound);
    console.log('Initial reviews visible:', modalInfo.reviewsFound);
    console.log('\nScrollable containers found:');
    modalInfo.containers.forEach((container: any, index: number) => {
      console.log(`\n  Container ${index + 1}:`);
      console.log(`    Selector: ${container.selector}`);
      console.log(`    Scrollable: ${container.isScrollable}`);
      console.log(`    ScrollHeight: ${container.scrollHeight}`);
      console.log(`    ClientHeight: ${container.clientHeight}`);
      console.log(`    Overflow: ${container.overflow} / ${container.overflowY}`);
      console.log(`    Position: ${container.position}`);
    });

    // Try different scrolling methods
    console.log('\n🔄 Testing scroll methods...\n');

    // Method 1: Scroll the modal dialog itself
    console.log('Method 1: Scrolling [role="dialog"]...');
    let scrollResult1 = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        const before = modal.scrollTop;
        modal.scrollTop += 500;
        const after = modal.scrollTop;
        return { success: true, scrolled: after !== before, before, after };
      }
      return { success: false };
    });
    console.log('Result:', scrollResult1);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Method 2: Find the specific scrollable div inside the modal
    console.log('\nMethod 2: Finding scrollable div inside modal...');
    const scrollResult2 = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
      if (!modal) return { success: false, message: 'No modal found' };

      // Find scrollable children
      const scrollableDivs = Array.from(modal.querySelectorAll('div')).filter(div => {
        const style = window.getComputedStyle(div);
        return (style.overflow === 'auto' || style.overflow === 'scroll' || 
                style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                div.scrollHeight > div.clientHeight;
      });

      if (scrollableDivs.length > 0) {
        const container = scrollableDivs[0];
        const before = container.scrollTop;
        container.scrollTop += 500;
        const after = container.scrollTop;
        console.log(`Scrolled container: before=${before}, after=${after}`);
        return { 
          success: true, 
          scrolled: after !== before, 
          before, 
          after,
          containersFound: scrollableDivs.length 
        };
      }
      return { success: false, message: 'No scrollable divs found' };
    });
    console.log('Result:', scrollResult2);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Method 3: Scroll by finding review container
    console.log('\nMethod 3: Scrolling review container directly...');
    const scrollResult3 = await page.evaluate(() => {
      // Look for container that holds reviews
      const reviewContainers = Array.from(document.querySelectorAll('div')).filter(div => {
        // Check if this div contains multiple review-like elements
        const hasReviews = div.querySelectorAll('[data-review-id], [role="article"], [class*="review"]').length > 2;
        const isScrollable = div.scrollHeight > div.clientHeight;
        return hasReviews && isScrollable;
      });

      if (reviewContainers.length > 0) {
        const container = reviewContainers[0];
        const before = container.scrollTop;
        container.scrollBy(0, 500);
        const after = container.scrollTop;
        console.log(`Found review container, scrolled: ${after - before}px`);
        return { success: true, scrolled: after !== before, before, after };
      }
      return { success: false, message: 'No review container found' };
    });
    console.log('Result:', scrollResult3);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Method 4: Use wheel event
    console.log('\nMethod 4: Using wheel event...');
    const scrollResult4 = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
      if (modal) {
        // Find the most likely scrollable container
        const scrollable = modal.querySelector('div[style*="overflow"], div[class*="scroll"]') || modal;
        
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 500,
          bubbles: true,
          cancelable: true,
        });
        
        scrollable.dispatchEvent(wheelEvent);
        return { success: true, method: 'wheel event dispatched' };
      }
      return { success: false };
    });
    console.log('Result:', scrollResult4);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Method 5: Progressive scrolling with monitoring
    console.log('\nMethod 5: Progressive scrolling with monitoring...');
    const finalScrollResult = await page.evaluate(async () => {
      const results: any = {
        method: 'progressive',
        scrollAttempts: [],
        reviewCounts: [],
        finalReviewCount: 0
      };

      // Function to count visible reviews
      const countReviews = () => {
        const reviewSelectors = [
          '[data-review-id]',
          '[role="article"]',
          'div[class*="review-item"]',
          'div[class*="ReviewItem"]'
        ];
        
        let maxCount = 0;
        for (const selector of reviewSelectors) {
          const count = document.querySelectorAll(selector).length;
          maxCount = Math.max(maxCount, count);
        }
        return maxCount;
      };

      // Find the scrollable container
      const findScrollContainer = () => {
        const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
        if (!modal) return null;

        // Check modal itself
        if ((modal as HTMLElement).scrollHeight > (modal as HTMLElement).clientHeight) {
          return modal as HTMLElement;
        }

        // Check children
        const scrollables = Array.from(modal.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return (style.overflow === 'auto' || style.overflow === 'scroll' || 
                  style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                  (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;
        });

        return scrollables[0] as HTMLElement || null;
      };

      const container = findScrollContainer();
      if (!container) {
        results.error = 'No scrollable container found';
        return results;
      }

      results.containerFound = true;
      results.containerType = container.tagName;
      results.containerClass = container.className.substring(0, 50);

      // Perform progressive scrolling
      let previousScrollTop = 0;
      let scrollCount = 0;
      const maxScrolls = 10;

      while (scrollCount < maxScrolls) {
        const beforeCount = countReviews();
        results.reviewCounts.push(beforeCount);

        // Scroll down
        container.scrollTop += 300;
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 500));

        const currentScrollTop = container.scrollTop;
        const afterCount = countReviews();

        results.scrollAttempts.push({
          attempt: scrollCount + 1,
          scrolledFrom: previousScrollTop,
          scrolledTo: currentScrollTop,
          reviewsBefore: beforeCount,
          reviewsAfter: afterCount,
          newReviewsLoaded: afterCount - beforeCount
        });

        // Check if we've reached the end
        if (currentScrollTop === previousScrollTop) {
          console.log('Reached end of scroll');
          break;
        }

        previousScrollTop = currentScrollTop;
        scrollCount++;
      }

      results.finalReviewCount = countReviews();
      return results;
    });

    console.log('\nProgressive Scroll Results:');
    console.log('Container found:', finalScrollResult.containerFound);
    console.log('Container type:', finalScrollResult.containerType);
    console.log('Container class:', finalScrollResult.containerClass);
    console.log('Final review count:', finalScrollResult.finalReviewCount);
    console.log('\nScroll attempts:');
    finalScrollResult.scrollAttempts?.forEach((attempt: any) => {
      console.log(`  Attempt ${attempt.attempt}: ${attempt.reviewsBefore} → ${attempt.reviewsAfter} reviews (+${attempt.newReviewsLoaded})`);
    });

    // Take a final screenshot
    console.log('\n📸 Taking final screenshot...');
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    await fs.writeFile('review-modal-debug.jpg', Buffer.from(screenshot, 'base64'));
    console.log('Screenshot saved as review-modal-debug.jpg');

    // Extract final review data
    console.log('\n📝 Extracting visible review data...');
    const reviewData = await page.evaluate(() => {
      const reviews: any[] = [];
      
      // Try multiple selectors to find reviews
      const reviewElements = document.querySelectorAll('[data-review-id], [role="article"], div[class*="review-item"], div[class*="ReviewItem"]');
      
      reviewElements.forEach((element, index) => {
        const textContent = (element as HTMLElement).innerText || '';
        if (textContent.length > 20) { // Filter out empty or very short elements
          reviews.push({
            index: index + 1,
            text: textContent.substring(0, 200) + '...',
            length: textContent.length
          });
        }
      });
      
      return reviews;
    });

    console.log(`\nExtracted ${reviewData.length} reviews:`);
    reviewData.slice(0, 5).forEach((review: any) => {
      console.log(`\n  Review ${review.index} (${review.length} chars):`);
      console.log(`    ${review.text}`);
    });

    if (reviewData.length > 5) {
      console.log(`\n  ... and ${reviewData.length - 5} more reviews`);
    }

  } catch (error) {
    console.error('Error during review modal debugging:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Debug session complete');
  }
}

// Run the debug script
debugReviewModalScrolling().catch(console.error);