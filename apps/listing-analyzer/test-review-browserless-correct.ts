import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
const TEST_URL = 'https://www.airbnb.com/rooms/1084268803864282186';

async function extractReviewsCorrectAPI() {
  console.log('🚀 Extracting Reviews with Correct Browserless API\n');

  // Use the /function endpoint with proper format
  const functionCode = `
    export default async function ({ page }) {
      const result = {
        success: false,
        reviews: [],
        rating: null,
        totalReviews: 0,
        logs: [],
        pageTitle: '',
        currentUrl: ''
      };
      
      try {
        // Navigate to the page
        await page.goto('${TEST_URL}', { waitUntil: 'networkidle2', timeout: 60000 });
        result.logs.push('Page loaded');
        
        // Get page info
        result.pageTitle = await page.title();
        result.currentUrl = page.url();
        result.logs.push('Title: ' + result.pageTitle);
        
        // Wait for content
        await page.waitForTimeout(5000);
        
        // Check if we're on the listing page
        const pageText = await page.evaluate(() => document.body.innerText);
        
        if (pageText.includes('reviews') || pageText.includes('rating')) {
          result.logs.push('Found review content on page');
          
          // Try to click review button
          const clicked = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, a, div'));
            for (const el of elements) {
              const text = el.innerText || '';
              if (text.match(/\\d+\\s+reviews?/i)) {
                el.click();
                return true;
              }
            }
            return false;
          });
          
          if (clicked) {
            result.logs.push('Clicked review element');
            await page.waitForTimeout(4000);
            
            // Check for modal
            const modalData = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
              if (!modal) return null;
              
              const text = modal.innerText || '';
              return {
                found: true,
                text: text.substring(0, 500),
                hasRating: text.includes('4.'),
                hasReviews: text.includes('review')
              };
            });
            
            if (modalData?.found) {
              result.logs.push('Modal found');
              result.success = true;
              
              // Extract data from modal
              const extracted = await page.evaluate(() => {
                const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
                if (!modal) return {};
                
                const text = modal.innerText || '';
                const ratingMatch = text.match(/4\\.\\d+/);
                const countMatch = text.match(/(\\d+)\\s+reviews?/i);
                
                return {
                  rating: ratingMatch ? ratingMatch[0] : null,
                  totalReviews: countMatch ? parseInt(countMatch[1]) : 0
                };
              });
              
              result.rating = extracted.rating;
              result.totalReviews = extracted.totalReviews;
            }
          }
        } else {
          result.logs.push('No review content found - may be blocked or redirected');
        }
        
      } catch (error) {
        result.logs.push('Error: ' + error.message);
      }
      
      return result;
    }
  `;

  try {
    const endpoint = `https://production-sfo.browserless.io/function?token=${BROWSERLESS_KEY}`;
    
    console.log('📡 Calling Browserless Function endpoint...');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/javascript'
      },
      body: functionCode
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      
      // Try alternative: Use content endpoint
      return await useContentEndpoint();
    }

    const data = await response.json();
    
    console.log('\n📊 Results:');
    console.log('━'.repeat(50));
    console.log('Page Title:', data.pageTitle);
    console.log('Current URL:', data.currentUrl);
    console.log('Success:', data.success);
    console.log('Rating:', data.rating);
    console.log('Total Reviews:', data.totalReviews);
    
    console.log('\n📝 Logs:');
    data.logs?.forEach(log => console.log(`  - ${log}`));
    
    await fs.writeFile('review-api-result.json', JSON.stringify(data, null, 2));
    console.log('\n💾 Saved to review-api-result.json');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function useContentEndpoint() {
  console.log('\n🔄 Trying /content endpoint instead...\n');
  
  const endpoint = `https://production-sfo.browserless.io/content?token=${BROWSERLESS_KEY}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: TEST_URL,
        gotoOptions: {
          waitUntil: 'networkidle2'
        },
        waitFor: 5000
      })
    });

    if (!response.ok) {
      console.error('Content API Error:', await response.text());
      return null;
    }

    const html = await response.text();
    
    // Parse the HTML to look for reviews
    const hasReviews = html.includes('reviews') || html.includes('rating');
    const hasGuestFavorite = html.includes('Guest favorite');
    
    console.log('📄 Page content received');
    console.log(`  Has reviews: ${hasReviews}`);
    console.log(`  Has Guest Favorite: ${hasGuestFavorite}`);
    
    // Extract rating if visible in HTML
    const ratingMatch = html.match(/4\.\d+/);
    const reviewCountMatch = html.match(/(\d+)\s+reviews?/i);
    
    if (ratingMatch) {
      console.log(`  Rating found: ${ratingMatch[0]}`);
    }
    if (reviewCountMatch) {
      console.log(`  Review count: ${reviewCountMatch[1]}`);
    }
    
    await fs.writeFile('page-content-api.html', html);
    console.log('\n💾 HTML saved to page-content-api.html');
    
    return {
      hasReviews,
      rating: ratingMatch?.[0],
      reviewCount: reviewCountMatch?.[1]
    };
    
  } catch (error) {
    console.error('❌ Content endpoint error:', error);
    return null;
  }
}

async function useScreenshotEndpoint() {
  console.log('\n📸 Using Screenshot endpoint for visual capture...\n');
  
  const endpoint = `https://production-sfo.browserless.io/screenshot?token=${BROWSERLESS_KEY}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: TEST_URL,
        options: {
          fullPage: false,
          type: 'jpeg',
          quality: 90
        },
        gotoOptions: {
          waitUntil: 'networkidle2'
        },
        waitFor: 5000,
        viewport: {
          width: 1920,
          height: 1080
        }
      })
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      await fs.writeFile('listing-screenshot.jpg', Buffer.from(buffer));
      console.log('✅ Screenshot saved to listing-screenshot.jpg');
      console.log('   Ready for Vision AI analysis');
      return true;
    } else {
      console.error('Screenshot error:', await response.text());
      return false;
    }
    
  } catch (error) {
    console.error('❌ Screenshot error:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Browserless Review Extraction Test');
  console.log('URL:', TEST_URL);
  console.log('═'.repeat(60));
  
  // Try function endpoint
  await extractReviewsCorrectAPI();
  
  // Also capture screenshot for backup
  console.log('\n' + '═'.repeat(60));
  await useScreenshotEndpoint();
  
  console.log('\n✅ All tests complete');
}

main().catch(console.error);