import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

interface ReviewExtractionResult {
  success: boolean;
  reviews: any[];
  rating: string | null;
  totalReviews: number;
  screenshots: string[];
  logs: string[];
  error?: string;
}

async function extractReviewsWithFunction(): Promise<ReviewExtractionResult> {
  console.log('🚀 Extracting Reviews using Browserless Function API\n');
  
  const result: ReviewExtractionResult = {
    success: false,
    reviews: [],
    rating: null,
    totalReviews: 0,
    screenshots: [],
    logs: []
  };

  // JavaScript function to run in the browser
  const extractionFunction = `
    async function extractReviews() {
      const result = {
        reviews: [],
        rating: null,
        totalReviews: 0,
        logs: [],
        modalOpened: false
      };
      
      try {
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        result.logs.push('Page loaded');
        
        // Scroll down to ensure review section loads
        window.scrollBy(0, 1000);
        await new Promise(resolve => setTimeout(resolve, 2000));
        result.logs.push('Scrolled to load content');
        
        // Find and click review element
        const reviewElements = Array.from(document.querySelectorAll('button, a, div'));
        let clicked = false;
        
        for (const el of reviewElements) {
          const text = el.innerText || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          
          // Look for review button/link patterns
          if (text.match(/\\d+\\s+reviews?/i) || 
              ariaLabel.toLowerCase().includes('review') ||
              text.includes('4.') && text.includes('reviews')) {
            
            result.logs.push('Found potential review element: ' + text.substring(0, 50));
            
            try {
              el.click();
              clicked = true;
              result.logs.push('Clicked review element');
              break;
            } catch (e) {
              result.logs.push('Could not click: ' + e.message);
            }
          }
        }
        
        if (!clicked) {
          // Alternative: Look for star rating element
          const ratingElements = document.querySelectorAll('[aria-label*="rating"], [aria-label*="Rating"], span[aria-label*="star"]');
          for (const el of ratingElements) {
            try {
              el.click();
              clicked = true;
              result.logs.push('Clicked rating element');
              break;
            } catch (e) {}
          }
        }
        
        if (clicked) {
          // Wait for modal to open
          await new Promise(resolve => setTimeout(resolve, 4000));
          
          // Check if modal opened
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (modal) {
            result.modalOpened = true;
            result.logs.push('Modal opened successfully');
            
            // Extract rating and review count from modal
            const modalText = modal.innerText || '';
            
            // Extract rating
            const ratingMatch = modalText.match(/4\\.\\d+/);
            if (ratingMatch) {
              result.rating = ratingMatch[0];
              result.logs.push('Found rating: ' + result.rating);
            }
            
            // Extract total reviews
            const countMatch = modalText.match(/(\\d+)\\s+reviews?/i);
            if (countMatch) {
              result.totalReviews = parseInt(countMatch[1]);
              result.logs.push('Found review count: ' + result.totalReviews);
            }
            
            // Try to scroll modal to load reviews
            let scrollContainer = modal;
            
            // Find scrollable container in modal
            const scrollables = modal.querySelectorAll('div');
            for (const div of scrollables) {
              if (div.scrollHeight > div.clientHeight) {
                const style = window.getComputedStyle(div);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                  scrollContainer = div;
                  result.logs.push('Found scrollable container');
                  break;
                }
              }
            }
            
            // Scroll to load reviews
            let lastScrollTop = 0;
            for (let i = 0; i < 10; i++) {
              scrollContainer.scrollTop += 300;
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              if (scrollContainer.scrollTop === lastScrollTop) {
                result.logs.push('Reached bottom of scroll');
                break;
              }
              lastScrollTop = scrollContainer.scrollTop;
            }
            
            // Extract individual reviews
            const reviewElements = modal.querySelectorAll('[data-review-id], [role="article"], div[class*="review"]');
            reviewElements.forEach((reviewEl, index) => {
              const text = reviewEl.innerText || '';
              if (text.length > 50) {
                result.reviews.push({
                  index: index + 1,
                  text: text.substring(0, 200),
                  length: text.length
                });
              }
            });
            
            result.logs.push('Extracted ' + result.reviews.length + ' reviews');
          } else {
            result.logs.push('Modal did not open');
          }
        } else {
          result.logs.push('Could not find review element to click');
        }
        
      } catch (error) {
        result.logs.push('Error: ' + error.message);
      }
      
      return result;
    }
    
    // Execute the function
    return extractReviews();
  `;

  try {
    const endpoint = `https://production-sfo.browserless.io/chrome/function?token=${BROWSERLESS_KEY}`;
    
    console.log('📡 Calling Browserless Function API...');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: TEST_URL,
        function: extractionFunction,
        args: [],
        options: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security'
          ]
        },
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 60000
        },
        viewport: {
          width: 1920,
          height: 1080
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Browserless API error: ${error}`);
    }

    const data = await response.json();
    
    console.log('\n📊 Extraction Results:');
    console.log('━'.repeat(50));
    
    if (data) {
      result.success = data.modalOpened || false;
      result.reviews = data.reviews || [];
      result.rating = data.rating;
      result.totalReviews = data.totalReviews;
      result.logs = data.logs || [];
      
      console.log(`Modal opened: ${data.modalOpened}`);
      console.log(`Rating: ${data.rating || 'Not found'}`);
      console.log(`Total reviews: ${data.totalReviews}`);
      console.log(`Reviews extracted: ${result.reviews.length}`);
      
      console.log('\n📝 Execution Logs:');
      result.logs.forEach(log => console.log(`  - ${log}`));
      
      if (result.reviews.length > 0) {
        console.log('\n📋 Sample Reviews:');
        result.reviews.slice(0, 3).forEach(review => {
          console.log(`\n  Review #${review.index}:`);
          console.log(`  ${review.text}...`);
        });
      }
    }

    // Save results
    await fs.writeFile(
      'review-extraction-results.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n💾 Results saved to review-extraction-results.json');

  } catch (error) {
    console.error('❌ Error:', error);
    result.error = error.message;
  }

  return result;
}

// Alternative: Use screenshot API to capture reviews
async function captureReviewScreenshots() {
  console.log('\n📸 Alternative: Capturing screenshots for Vision AI analysis\n');
  
  const endpoint = `https://production-sfo.browserless.io/chrome/screenshot?token=${BROWSERLESS_KEY}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: TEST_URL,
        options: {
          fullPage: true,
          type: 'jpeg',
          quality: 85
        },
        gotoOptions: {
          waitUntil: 'networkidle2'
        },
        waitForTimeout: 5000,
        scrollPage: true,
        scripts: [{
          contents: `
            // Try to open review modal before screenshot
            const reviewBtn = Array.from(document.querySelectorAll('button, a')).find(el => 
              el.innerText?.match(/\\d+ reviews?/i)
            );
            if (reviewBtn) reviewBtn.click();
          `
        }]
      })
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      await fs.writeFile('review-screenshot.jpg', Buffer.from(buffer));
      console.log('✅ Screenshot saved to review-screenshot.jpg');
      console.log('   This can be analyzed with Vision AI to extract reviews');
    } else {
      console.log('❌ Screenshot failed:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Screenshot error:', error);
  }
}

// Run both methods
async function main() {
  console.log('🔍 Review Extraction Test\n');
  console.log('Testing URL:', TEST_URL);
  console.log('═'.repeat(60));
  
  // Try function-based extraction
  const result = await extractReviewsWithFunction();
  
  // If function extraction didn't get reviews, try screenshot method
  if (result.reviews.length === 0) {
    console.log('\n⚠️ No reviews extracted with function method');
    await captureReviewScreenshots();
  }
  
  console.log('\n✅ Test complete');
}

main().catch(console.error);