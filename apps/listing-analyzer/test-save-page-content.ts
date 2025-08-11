import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

async function savePageContent() {
  console.log('💾 Saving Page Content for Analysis\n');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_KEY}`,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent to appear more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📱 Loading listing page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to trigger lazy loading
    console.log('📜 Scrolling page to trigger lazy loading...');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 500);
      });
    });
    
    // Wait for any final content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page content
    const pageContent = await page.content();
    await fs.writeFile('page-content.html', pageContent);
    console.log('📄 HTML content saved to page-content.html');
    
    // Get page text
    const pageText = await page.evaluate(() => document.body.innerText);
    await fs.writeFile('page-text.txt', pageText);
    console.log('📝 Text content saved to page-text.txt');
    
    // Take full page screenshot
    const screenshot = await page.screenshot({ 
      fullPage: true, 
      encoding: 'base64' 
    });
    await fs.writeFile('page-full.jpg', Buffer.from(screenshot, 'base64'));
    console.log('📸 Full page screenshot saved to page-full.jpg');
    
    // Look for specific patterns in the content
    console.log('\n🔍 Content Analysis:');
    
    const analysis = await page.evaluate(() => {
      const text = document.body.innerText;
      
      return {
        hasGuestFavorite: text.includes('Guest favorite'),
        hasRating: /4\.\d+/.test(text),
        hasReviewCount: /\d+\s+reviews?/i.test(text),
        hasShowAllReviews: text.toLowerCase().includes('show all'),
        hasReviewSection: text.toLowerCase().includes('reviews') || text.toLowerCase().includes('rating'),
        
        // Find any text that looks like ratings
        ratingMatches: text.match(/4\.\d+/g) || [],
        reviewCountMatches: text.match(/\d+\s+reviews?/gi) || [],
        
        // Check for specific UI elements
        totalImages: document.querySelectorAll('img').length,
        totalButtons: document.querySelectorAll('button').length,
        totalDivs: document.querySelectorAll('div').length,
        
        // Check page title and URL
        pageTitle: document.title,
        pageURL: window.location.href
      };
    });
    
    console.log(JSON.stringify(analysis, null, 2));
    
    // Check if we're on a different page or blocked
    if (!analysis.hasRating && !analysis.hasReviewCount) {
      console.log('\n⚠️ Warning: Expected content not found!');
      console.log('This might indicate:');
      console.log('  - The page structure has changed');
      console.log('  - Content is behind authentication');
      console.log('  - Anti-bot measures are in place');
      console.log('  - The listing URL is invalid or changed');
    }
    
    // Try to find any clickable review elements using a broader search
    console.log('\n🔍 Searching for ANY clickable elements with numbers...');
    const clickables = await page.evaluate(() => {
      const results = [];
      const elements = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');
      
      elements.forEach(el => {
        const text = (el as HTMLElement).innerText || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        
        // Look for any number patterns
        if (/\d/.test(text) || /\d/.test(ariaLabel)) {
          results.push({
            tagName: el.tagName,
            text: text.substring(0, 50),
            ariaLabel: ariaLabel.substring(0, 50),
            hasNumbers: true
          });
        }
      });
      
      return results.slice(0, 10);
    });
    
    console.log('Clickable elements with numbers:');
    clickables.forEach(el => {
      console.log(`  ${el.tagName}: "${el.text || el.ariaLabel}"`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Content saved for analysis');
    console.log('Check these files:');
    console.log('  - page-content.html (full HTML)');
    console.log('  - page-text.txt (extracted text)');
    console.log('  - page-full.jpg (screenshot)');
  }
}

// Run the content saver
savePageContent().catch(console.error);