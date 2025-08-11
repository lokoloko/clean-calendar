import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

async function findReviewElements() {
  console.log('🔍 Finding Review Elements on Page\n');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_KEY}`,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📱 Loading listing page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll down to ensure reviews section is loaded
    console.log('📜 Scrolling to load reviews section...');
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take a screenshot first
    console.log('📸 Taking page screenshot...');
    const screenshot1 = await page.screenshot({ encoding: 'base64' });
    await fs.writeFile('page-before-scroll.jpg', Buffer.from(screenshot1, 'base64'));

    // Find elements with rating/review numbers
    console.log('\n🔢 Looking for rating/review numbers...');
    const ratingElements = await page.evaluate(() => {
      const results = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const text = (el as HTMLElement).innerText || '';
        const trimmedText = text.trim();
        
        // Look for patterns like "4.86" or "29 reviews"
        if (trimmedText.match(/^4\.\d{1,2}$/) || // Rating like 4.86
            trimmedText.match(/^\d+\s+reviews?$/i) || // Review count
            trimmedText.match(/^★\s*4\.\d{1,2}/) || // Rating with star
            trimmedText.includes('Guest favorite')) {
          
          // Get parent elements to understand context
          let parent = el.parentElement;
          let parentText = '';
          if (parent) {
            parentText = (parent as HTMLElement).innerText || '';
          }
          
          results.push({
            text: trimmedText.substring(0, 100),
            tagName: el.tagName,
            className: el.className || 'no-class',
            id: el.id || 'no-id',
            parentText: parentText.substring(0, 100),
            isClickable: el.tagName === 'A' || el.tagName === 'BUTTON' || 
                        window.getComputedStyle(el).cursor === 'pointer',
            hasOnClick: (el as HTMLElement).onclick !== null
          });
        }
      });
      
      return results.slice(0, 20); // First 20 matches
    });

    console.log(`Found ${ratingElements.length} potential rating/review elements:`);
    ratingElements.forEach(el => {
      console.log(`  ${el.tagName}: "${el.text}"`);
      if (el.isClickable) console.log(`    ↳ Clickable!`);
    });

    // Try to find and click the most likely review element
    console.log('\n🎯 Attempting to click review elements...');
    
    for (let i = 0; i < Math.min(3, ratingElements.length); i++) {
      const element = ratingElements[i];
      
      if (element.text.includes('review') || element.text.match(/^4\.\d/)) {
        console.log(`\nTrying element ${i + 1}: "${element.text}"`);
        
        const clicked = await page.evaluate((searchText) => {
          const elements = document.querySelectorAll('*');
          for (const el of Array.from(elements)) {
            if ((el as HTMLElement).innerText?.trim() === searchText) {
              // Try clicking parent if element itself isn't clickable
              let target = el as HTMLElement;
              let attempts = 0;
              
              while (attempts < 3) {
                try {
                  target.click();
                  return { clicked: true, level: attempts };
                } catch (e) {
                  // Try parent
                  if (target.parentElement) {
                    target = target.parentElement as HTMLElement;
                    attempts++;
                  } else {
                    break;
                  }
                }
              }
            }
          }
          return { clicked: false };
        }, element.text);
        
        if (clicked.clicked) {
          console.log(`  ✅ Clicked successfully at level ${clicked.level}`);
          
          // Wait and check for modal
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const modalFound = await page.evaluate(() => {
            return document.querySelector('[role="dialog"], [aria-modal="true"]') !== null;
          });
          
          if (modalFound) {
            console.log('  🎉 Modal opened!');
            
            // Analyze the modal
            const modalContent = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
              if (!modal) return null;
              
              const text = (modal as HTMLElement).innerText || '';
              
              // Look for reviews in modal
              const reviewElements = modal.querySelectorAll('[data-review-id], [role="article"], div[class*="review"]');
              
              return {
                textLength: text.length,
                hasRating: text.includes('4.'),
                hasReviewCount: /\d+\s+reviews?/i.test(text),
                reviewElementsFound: reviewElements.length,
                firstLines: text.split('\n').slice(0, 10).join('\n')
              };
            });
            
            console.log('\n📊 Modal content analysis:');
            console.log(JSON.stringify(modalContent, null, 2));
            
            // Take screenshot of modal
            const modalScreenshot = await page.screenshot({ encoding: 'base64' });
            await fs.writeFile('modal-opened.jpg', Buffer.from(modalScreenshot, 'base64'));
            console.log('📸 Modal screenshot saved: modal-opened.jpg');
            
            return;
          }
        }
      }
    }

    // If no modal opened, scroll more and check for lazy-loaded reviews
    console.log('\n📜 Scrolling to find review section...');
    
    for (let scroll = 0; scroll < 5; scroll++) {
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reviewSection = await page.evaluate(() => {
        // Look for section headings that might indicate reviews
        const headings = document.querySelectorAll('h2, h3, div[class*="section"]');
        for (const heading of Array.from(headings)) {
          const text = (heading as HTMLElement).innerText || '';
          if (text.toLowerCase().includes('review') || text.includes('Guest reviews')) {
            return {
              found: true,
              text: text,
              position: heading.getBoundingClientRect().top
            };
          }
        }
        return { found: false };
      });
      
      if (reviewSection.found) {
        console.log(`  ✅ Found review section: "${reviewSection.text}"`);
        
        // Take screenshot
        const screenshot = await page.screenshot({ encoding: 'base64' });
        await fs.writeFile('review-section-found.jpg', Buffer.from(screenshot, 'base64'));
        console.log('  📸 Screenshot saved: review-section-found.jpg');
        break;
      }
    }

    // Final analysis of page structure
    console.log('\n📋 Final page analysis:');
    const pageAnalysis = await page.evaluate(() => {
      return {
        hasDialog: document.querySelector('[role="dialog"]') !== null,
        hasModal: document.querySelector('[aria-modal="true"]') !== null,
        totalButtons: document.querySelectorAll('button').length,
        totalLinks: document.querySelectorAll('a').length,
        pageHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight
      };
    });
    
    console.log(JSON.stringify(pageAnalysis, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Analysis complete');
  }
}

// Run the analysis
findReviewElements().catch(console.error);