#\!/usr/bin/env node

const AIRBNB_URL = 'https://www.airbnb.com/rooms/745840653702711751';
const BROWSERLESS_ENDPOINT = 'https://production-sfo.browserless.io/chromium/bql';
const TOKEN = '2SVmjXQy74ad8Hu806816ad6b641e50068100cc7f1d0d61d0';

console.log('🚀 Testing scraping for user property...');
console.log(`📍 Target URL: ${AIRBNB_URL}`);

const query = `
mutation ScrapeAirbnb {
  goto(url: "${AIRBNB_URL}", waitUntil: networkIdle) {
    status
  }
  
  title: text(selector: "h1", timeout: 5000) {
    text
  }
  
  # Try different selectors for price
  priceSpan: text(selector: "span._tyxjp1", timeout: 3000) {
    text
  }
  
  priceDiv: text(selector: "div._i5duul", timeout: 3000) {
    text  
  }
  
  # Try for rating
  rating: text(selector: "span._17p6nbba", timeout: 3000) {
    text
  }
  
  # Get full HTML to parse manually
  fullHtml: html {
    html
  }
}
`;

async function test() {
  try {
    const response = await fetch(`${BROWSERLESS_ENDPOINT}?token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (result.data) {
      console.log('\n✅ Scraping successful\!');
      console.log('Title:', result.data.title?.text || 'Not found');
      console.log('Price (span):', result.data.priceSpan?.text || 'Not found');
      console.log('Price (div):', result.data.priceDiv?.text || 'Not found');
      console.log('Rating:', result.data.rating?.text || 'Not found');
      
      // Try to extract from HTML
      if (result.data.fullHtml?.html) {
        const html = result.data.fullHtml.html;
        
        // Look for price
        const priceMatch = html.match(/\$(\d+)\s*(?:per\s*)?night/i);
        if (priceMatch) {
          console.log('Price from HTML:', '$' + priceMatch[1]);
        }
        
        // Look for rating  
        const ratingMatch = html.match(/(\d+\.\d+)\s*·\s*(\d+)\s*reviews?/i);
        if (ratingMatch) {
          console.log('Rating from HTML:', ratingMatch[1] + ' (' + ratingMatch[2] + ' reviews)');
        }
      }
    } else {
      console.log('❌ No data received');
      if (result.errors) {
        console.log('Errors:', result.errors);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
