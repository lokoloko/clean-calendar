import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

async function visualDebugReviewModal() {
  console.log('👁️ Visual Debug Mode for Review Modal\n');
  console.log('This script will help identify the exact scrollable container\n');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_KEY}`,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📱 Loading page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Open review modal
    console.log('🔓 Opening review modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewBtn = buttons.find(b => 
        b.getAttribute('aria-label')?.includes('review') ||
        b.getAttribute('aria-label')?.includes('rating') ||
        b.textContent?.includes('review')
      );
      if (reviewBtn) reviewBtn.click();
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Inject visual debugging helpers
    console.log('💉 Injecting visual debug helpers...\n');
    await page.evaluate(() => {
      // Add CSS for visual debugging
      const style = document.createElement('style');
      style.textContent = `
        .debug-scrollable {
          border: 3px solid red !important;
          position: relative !important;
        }
        .debug-scrollable::before {
          content: 'SCROLLABLE' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          background: red !important;
          color: white !important;
          padding: 5px 10px !important;
          font-size: 12px !important;
          z-index: 10000 !important;
        }
        .debug-modal {
          border: 3px solid blue !important;
        }
        .debug-review-container {
          border: 3px solid green !important;
        }
        .debug-info {
          position: fixed !important;
          top: 10px !important;
          right: 10px !important;
          background: black !important;
          color: white !important;
          padding: 20px !important;
          z-index: 10001 !important;
          font-family: monospace !important;
          font-size: 14px !important;
          max-width: 400px !important;
        }
      `;
      document.head.appendChild(style);

      // Find and mark modal
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
      if (modal) {
        modal.classList.add('debug-modal');
      }

      // Find and mark all scrollable elements
      const allElements = document.querySelectorAll('*');
      const scrollableElements: any[] = [];
      
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        
        // Check if element is scrollable
        const hasScrollOverflow = 
          style.overflow === 'auto' || 
          style.overflow === 'scroll' || 
          style.overflowY === 'auto' || 
          style.overflowY === 'scroll';
        
        const canScroll = htmlEl.scrollHeight > htmlEl.clientHeight;
        
        if (hasScrollOverflow && canScroll) {
          htmlEl.classList.add('debug-scrollable');
          
          // Check if it contains reviews
          const reviewCount = htmlEl.querySelectorAll('[data-review-id], [role="article"], [class*="review"]').length;
          
          scrollableElements.push({
            element: htmlEl,
            scrollHeight: htmlEl.scrollHeight,
            clientHeight: htmlEl.clientHeight,
            scrollTop: htmlEl.scrollTop,
            reviewCount: reviewCount,
            className: htmlEl.className,
            id: htmlEl.id,
            tagName: htmlEl.tagName
          });
          
          if (reviewCount > 2) {
            htmlEl.classList.add('debug-review-container');
          }
        }
      });

      // Create info panel
      const infoPanel = document.createElement('div');
      infoPanel.className = 'debug-info';
      infoPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Debug Info</h3>
        <div>Modal Found: ${modal ? 'YES' : 'NO'}</div>
        <div>Scrollable Elements: ${scrollableElements.length}</div>
        <hr style="margin: 10px 0;">
        ${scrollableElements.map((el, i) => `
          <div style="margin-bottom: 10px; padding: 5px; background: #333;">
            <div>Container ${i + 1}:</div>
            <div>Tag: ${el.tagName}</div>
            <div>Reviews: ${el.reviewCount}</div>
            <div>Height: ${el.clientHeight}px / ${el.scrollHeight}px</div>
            <div>Can Scroll: ${el.scrollHeight - el.clientHeight}px</div>
          </div>
        `).join('')}
      `;
      document.body.appendChild(infoPanel);

      return scrollableElements;
    });

    // Take screenshot with visual markers
    console.log('📸 Taking screenshot with visual debug markers...');
    await page.screenshot({ path: 'review-debug-visual-1.jpg', fullPage: false });
    console.log('   Saved: review-debug-visual-1.jpg (RED = scrollable, BLUE = modal, GREEN = has reviews)\n');

    // Try scrolling each marked container
    console.log('🔄 Testing scroll on each container...\n');
    
    const scrollResults = await page.evaluate(async () => {
      const results: any[] = [];
      const scrollables = document.querySelectorAll('.debug-scrollable');
      
      for (let i = 0; i < scrollables.length; i++) {
        const element = scrollables[i] as HTMLElement;
        const beforeScroll = element.scrollTop;
        const beforeReviews = document.querySelectorAll('[data-review-id], [role="article"]').length;
        
        // Try to scroll
        element.scrollTop += 500;
        
        // Wait for potential lazy loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterScroll = element.scrollTop;
        const afterReviews = document.querySelectorAll('[data-review-id], [role="article"]').length;
        
        results.push({
          containerIndex: i + 1,
          scrolled: afterScroll > beforeScroll,
          scrollDistance: afterScroll - beforeScroll,
          newReviewsLoaded: afterReviews - beforeReviews,
          totalReviewsNow: afterReviews
        });
        
        // Update info panel
        const infoPanel = document.querySelector('.debug-info');
        if (infoPanel && afterScroll > beforeScroll) {
          const scrollInfo = document.createElement('div');
          scrollInfo.style.cssText = 'background: green; padding: 5px; margin-top: 10px;';
          scrollInfo.innerHTML = `✅ Container ${i + 1} SCROLLED ${afterScroll - beforeScroll}px`;
          infoPanel.appendChild(scrollInfo);
        }
      }
      
      return results;
    });

    console.log('Scroll Test Results:');
    scrollResults.forEach(result => {
      if (result.scrolled) {
        console.log(`  ✅ Container ${result.containerIndex}: Scrolled ${result.scrollDistance}px`);
        if (result.newReviewsLoaded > 0) {
          console.log(`     📝 Loaded ${result.newReviewsLoaded} new reviews (total: ${result.totalReviewsNow})`);
        }
      } else {
        console.log(`  ❌ Container ${result.containerIndex}: Could not scroll`);
      }
    });

    // Take another screenshot after scrolling
    console.log('\n📸 Taking screenshot after scroll attempts...');
    await page.screenshot({ path: 'review-debug-visual-2.jpg', fullPage: false });
    console.log('   Saved: review-debug-visual-2.jpg\n');

    // Try the most promising container
    console.log('🎯 Finding best container for reviews...');
    const bestContainer = await page.evaluate(() => {
      let best = null;
      let maxReviews = 0;
      
      document.querySelectorAll('.debug-scrollable').forEach((el, index) => {
        const reviewCount = el.querySelectorAll('[data-review-id], [role="article"], [class*="review"]').length;
        if (reviewCount > maxReviews) {
          maxReviews = reviewCount;
          best = {
            index,
            element: el as HTMLElement,
            reviewCount,
            scrollHeight: (el as HTMLElement).scrollHeight,
            clientHeight: (el as HTMLElement).clientHeight
          };
        }
      });
      
      if (best) {
        // Highlight the best container
        best.element.style.border = '5px solid lime';
        best.element.style.boxShadow = '0 0 20px lime';
        
        // Try progressive scrolling
        const scrollToBottom = async () => {
          let previousScroll = 0;
          let currentScroll = 0;
          let attempts = 0;
          
          while (attempts < 15) {
            previousScroll = best.element.scrollTop;
            best.element.scrollTop += 300;
            await new Promise(resolve => setTimeout(resolve, 800));
            currentScroll = best.element.scrollTop;
            
            if (currentScroll === previousScroll) {
              break; // Reached bottom
            }
            attempts++;
          }
          
          return {
            totalScrolled: currentScroll,
            scrollAttempts: attempts
          };
        };
        
        return scrollToBottom().then(scrollInfo => ({
          found: true,
          containerIndex: best.index,
          initialReviews: best.reviewCount,
          ...scrollInfo,
          finalReviews: document.querySelectorAll('[data-review-id], [role="article"]').length
        }));
      }
      
      return { found: false };
    });

    if (bestContainer.found) {
      console.log(`✅ Best container found: Container ${bestContainer.containerIndex + 1}`);
      console.log(`   Reviews: ${bestContainer.initialReviews} → ${bestContainer.finalReviews}`);
      console.log(`   Scrolled: ${bestContainer.totalScrolled}px in ${bestContainer.scrollAttempts} attempts`);
    } else {
      console.log('❌ No suitable review container found');
    }

    // Final screenshot
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ path: 'review-debug-visual-3.jpg', fullPage: false });
    console.log('   Saved: review-debug-visual-3.jpg (LIME = best container)\n');

    // Extract selector for the best container
    const bestSelector = await page.evaluate(() => {
      const best = document.querySelector('[style*="lime"]');
      if (!best) return null;
      
      // Try to generate a useful selector
      const getSelector = (el: Element): string => {
        if (el.id) return `#${el.id}`;
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => 
            c && !c.includes('debug') && c.length < 20
          );
          if (classes.length > 0) {
            return `${el.tagName.toLowerCase()}.${classes[0]}`;
          }
        }
        
        // Try nth-child
        const parent = el.parentElement;
        if (parent) {
          const index = Array.from(parent.children).indexOf(el);
          return `${el.tagName.toLowerCase()}:nth-child(${index + 1})`;
        }
        
        return el.tagName.toLowerCase();
      };
      
      return {
        selector: getSelector(best),
        path: [],
        attributes: {
          className: best.className,
          id: best.id,
          tagName: best.tagName
        }
      };
    });

    if (bestSelector) {
      console.log('📝 Best Container Selector:');
      console.log(`   Selector: ${bestSelector.selector}`);
      console.log(`   Tag: ${bestSelector.attributes.tagName}`);
      if (bestSelector.attributes.id) {
        console.log(`   ID: ${bestSelector.attributes.id}`);
      }
      if (bestSelector.attributes.className) {
        console.log(`   Classes: ${bestSelector.attributes.className}`);
      }
    }

    // Save findings
    const findings = {
      modalFound: true,
      scrollContainersFound: scrollResults.length,
      successfulScrolls: scrollResults.filter(r => r.scrolled).length,
      bestContainer: bestSelector,
      reviewsExtracted: bestContainer.finalReviews || 0
    };

    await fs.writeFile('review-debug-findings.json', JSON.stringify(findings, null, 2));
    console.log('\n💾 Findings saved to review-debug-findings.json');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Visual debug complete');
    console.log('\n📁 Check these files:');
    console.log('   - review-debug-visual-1.jpg (initial state)');
    console.log('   - review-debug-visual-2.jpg (after scroll)');
    console.log('   - review-debug-visual-3.jpg (best container)');
    console.log('   - review-debug-findings.json (data)');
  }
}

// Run visual debug
visualDebugReviewModal().catch(console.error);