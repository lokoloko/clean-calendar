import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

async function testReviewModalOpening() {
  console.log('🔍 Testing Review Modal Opening Methods\n');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_KEY}`,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📱 Loading listing page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Method 1: Look for review links
    console.log('\n🔗 Method 1: Clicking review link...');
    const linkClicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      console.log(`Found ${links.length} links on page`);
      
      // Look for links with review text
      const reviewLink = links.find(a => {
        const text = a.innerText || '';
        const href = a.href || '';
        const ariaLabel = a.getAttribute('aria-label') || '';
        
        // Debug log
        if (text.includes('review')) {
          console.log(`Found link with review text: "${text}"`);
        }
        
        return text.match(/\d+ reviews?/i) || 
               ariaLabel.includes('review') ||
               href.includes('#reviews');
      });
      
      if (reviewLink) {
        console.log(`Clicking review link: "${reviewLink.innerText}"`);
        reviewLink.click();
        return { clicked: true, text: reviewLink.innerText };
      }
      
      return { clicked: false };
    });
    
    console.log('Link click result:', linkClicked);
    
    if (linkClicked.clicked) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Check if modal opened
      const modalFound = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
        return modal !== null;
      });
      
      console.log('Modal found after link click:', modalFound);
      
      if (modalFound) {
        console.log('✅ Successfully opened modal via link!');
        await analyzeModal(page);
        return;
      }
    }

    // Method 2: Look for review buttons
    console.log('\n🔘 Method 2: Clicking review button...');
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      console.log(`Found ${buttons.length} buttons on page`);
      
      // Look for buttons with review-related text or aria-label
      const reviewButton = buttons.find(b => {
        const text = b.innerText || '';
        const ariaLabel = b.getAttribute('aria-label') || '';
        
        // Debug log
        if (text.includes('review') || ariaLabel.includes('review')) {
          console.log(`Found button: text="${text}", aria-label="${ariaLabel}"`);
        }
        
        return text.match(/\d+ reviews?/i) || 
               ariaLabel.toLowerCase().includes('review') ||
               ariaLabel.toLowerCase().includes('rating');
      });
      
      if (reviewButton) {
        console.log(`Clicking button: "${reviewButton.innerText || reviewButton.getAttribute('aria-label')}"`);
        reviewButton.click();
        return { clicked: true, text: reviewButton.innerText };
      }
      
      return { clicked: false };
    });
    
    console.log('Button click result:', buttonClicked);
    
    if (buttonClicked.clicked) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const modalFound = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
        return modal !== null;
      });
      
      console.log('Modal found after button click:', modalFound);
      
      if (modalFound) {
        console.log('✅ Successfully opened modal via button!');
        await analyzeModal(page);
        return;
      }
    }

    // Method 3: Look for any clickable element with review count
    console.log('\n🎯 Method 3: Finding any clickable with review count...');
    const anyClicked = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const clickables = [];
      
      allElements.forEach(el => {
        const text = (el as HTMLElement).innerText || '';
        const tagName = el.tagName.toLowerCase();
        
        // Check if it contains review count
        if (text.match(/^\d+ reviews?$/i) || text.match(/^4\.\d+.*\d+ reviews?/i)) {
          const isClickable = tagName === 'a' || tagName === 'button' || 
                            (el as HTMLElement).onclick !== null ||
                            window.getComputedStyle(el).cursor === 'pointer';
          
          if (isClickable) {
            clickables.push({
              element: el,
              text: text.substring(0, 50),
              tagName: tagName
            });
          }
        }
      });
      
      console.log(`Found ${clickables.length} clickable elements with review text`);
      
      if (clickables.length > 0) {
        const target = clickables[0];
        console.log(`Clicking ${target.tagName}: "${target.text}"`);
        (target.element as HTMLElement).click();
        return { clicked: true, text: target.text, tagName: target.tagName };
      }
      
      return { clicked: false };
    });
    
    console.log('Any element click result:', anyClicked);
    
    if (anyClicked.clicked) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const modalFound = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
        return modal !== null;
      });
      
      console.log('Modal found after element click:', modalFound);
      
      if (modalFound) {
        console.log('✅ Successfully opened modal via element!');
        await analyzeModal(page);
        return;
      }
    }

    console.log('\n❌ Could not open review modal with any method');
    
    // Debug: List all elements with review text
    console.log('\n📋 Debug: Elements containing "review" text:');
    const reviewElements = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('*').forEach(el => {
        const text = (el as HTMLElement).innerText || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        
        if (text.toLowerCase().includes('review') || ariaLabel.toLowerCase().includes('review')) {
          elements.push({
            tagName: el.tagName,
            text: text.substring(0, 100),
            ariaLabel: ariaLabel,
            className: el.className,
            id: el.id,
            href: (el as HTMLAnchorElement).href || ''
          });
        }
      });
      return elements.slice(0, 10); // First 10 matches
    });
    
    reviewElements.forEach(el => {
      console.log(`  ${el.tagName}: "${el.text || el.ariaLabel}"`);
      if (el.href) console.log(`    href: ${el.href}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete');
  }
}

async function analyzeModal(page: puppeteer.Page) {
  console.log('\n📊 Analyzing opened modal...');
  
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!modal) return { found: false };
    
    const modalText = (modal as HTMLElement).innerText || '';
    
    // Look for scrollable containers
    const scrollables = [];
    modal.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                          (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;
      
      if (isScrollable) {
        scrollables.push({
          tagName: el.tagName,
          className: el.className,
          scrollHeight: (el as HTMLElement).scrollHeight,
          clientHeight: (el as HTMLElement).clientHeight
        });
      }
    });
    
    // Count review-like elements
    const reviewCount = modal.querySelectorAll('[data-review-id], [role="article"], div[class*="review"]').length;
    
    // Extract rating if visible
    const ratingMatch = modalText.match(/4\.\d+/);
    const rating = ratingMatch ? ratingMatch[0] : null;
    
    // Extract review count
    const countMatch = modalText.match(/(\d+)\s+reviews?/i);
    const totalReviews = countMatch ? countMatch[1] : null;
    
    return {
      found: true,
      scrollableContainers: scrollables.length,
      scrollables: scrollables.slice(0, 3), // First 3
      reviewElementsFound: reviewCount,
      rating: rating,
      totalReviews: totalReviews,
      textLength: modalText.length
    };
  });
  
  console.log('Modal analysis:', JSON.stringify(modalInfo, null, 2));
  
  // Take screenshot
  const screenshot = await page.screenshot({ encoding: 'base64' });
  await fs.writeFile('review-modal-opened.jpg', Buffer.from(screenshot, 'base64'));
  console.log('📸 Screenshot saved: review-modal-opened.jpg');
}

// Run the test
testReviewModalOpening().catch(console.error);