#!/usr/bin/env node

/**
 * Test script for scraping Airbnb property data using BrowserQL
 * Target: L2 - https://www.airbnb.com/rooms/932881437285859521
 */

require('dotenv').config({ path: '../../../.env.local' });

const fs = require('fs');
const path = require('path');

const AIRBNB_URL = 'https://www.airbnb.com/rooms/932881437285859521?guests=1&adults=1';
const BROWSERLESS_ENDPOINT = 'https://production-sfo.browserless.io/chromium/bql';
const TOKEN = process.env.BROWSERLESS_API_KEY;

if (!TOKEN) {
  console.error('❌ BROWSERLESS_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('🚀 Starting Airbnb scraper test...');
console.log(`📍 Target URL: ${AIRBNB_URL}`);
console.log(`🔑 API Key: ${TOKEN.substring(0, 10)}...`);

/**
 * BrowserQL query to scrape Airbnb listing
 */
const createQuery = (url) => `
mutation ScrapeAirbnb {
  goto(url: "${url}", waitUntil: networkIdle) {
    status
    url
  }
  
  # Get page title
  title: text(selector: "h1", timeout: 5000) {
    text
  }
  
  # Scroll to load more content first
  scroll1: scroll(y: 1000) {
    x
    y
  }
  
  # Try to get reviews section first (most reliable)
  reviewsSection: html(selector: "[data-section-id='REVIEWS_DEFAULT']", timeout: 5000) {
    html
  }
  
  scroll2: scroll(y: 2000) {
    x
    y
  }
  
  # Try to get amenities section
  amenitiesSection: html(selector: "[data-section-id='AMENITIES_DEFAULT']", timeout: 5000) {
    html
  }
  
  scroll3: scroll(y: 3000) {
    x
    y
  }
  
  # Try to get house rules section
  houseRulesSection: html(selector: "[data-section-id='POLICIES_DEFAULT']", timeout: 5000) {
    html
  }
  
  scroll4: scroll(y: 4000) {
    x
    y
  }
  
  # Take a screenshot for debugging
  screenshot(fullPage: false) {
    base64
  }
  
  # Get the full HTML for detailed parsing (this is most important)
  fullHtml: html {
    html
  }
}
`;

/**
 * Execute BrowserQL query
 */
async function executeScraping() {
  try {
    console.log('\n📡 Sending request to Browserless...');
    
    const response = await fetch(`${BROWSERLESS_ENDPOINT}?token=${TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: createQuery(AIRBNB_URL),
        variables: {}
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Check for GraphQL errors
    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      return null;
    }

    console.log('✅ Response received successfully');
    return result.data;
  } catch (error) {
    console.error('❌ Error executing query:', error);
    return null;
  }
}

/**
 * Parse and extract data from the response
 */
function parseResponse(data) {
  if (!data) {
    console.log('❌ No data to parse');
    return null;
  }

  const results = {
    basic: {},
    amenities: [],
    houseRules: [],
    reviews: {},
    calendar: {},
    sections: []
  };

  // Basic info
  if (data.title?.text) {
    results.basic.title = data.title.text.trim();
    console.log(`\n📝 Title: ${results.basic.title}`);
  }

  // Price and rating might not be found with old selectors
  // We'll extract from full HTML later

  // Check what we got
  console.log('\n📑 Data received:');
  if (data.goto) console.log(`  - Page loaded: ${data.goto.status}`);
  if (data.screenshot) console.log(`  - Screenshot: Yes`);
  if (data.fullHtml) console.log(`  - Full HTML: Yes`);

  // Parse amenities if available
  if (data.amenitiesSection?.html) {
    console.log('\n🏠 Amenities section found');
    const amenitiesHtml = data.amenitiesSection.html;
    // Simple extraction - would need more sophisticated parsing
    const amenityMatches = amenitiesHtml.match(/>([^<]+)</g);
    if (amenityMatches) {
      results.amenities = amenityMatches
        .map(m => m.replace(/^>|<$/g, '').trim())
        .filter(text => text.length > 2 && text.length < 100);
      console.log(`  Found ${results.amenities.length} potential amenities`);
    }
  }

  // Parse house rules if available
  if (data.houseRulesSection?.html) {
    console.log('\n📋 House rules section found');
    const rulesHtml = data.houseRulesSection.html;
    // Extract check-in/checkout times and rules
    const checkInMatch = rulesHtml.match(/check-in[^>]*>([^<]+)/i);
    const checkOutMatch = rulesHtml.match(/checkout[^>]*>([^<]+)/i);
    
    if (checkInMatch) results.houseRules.push(`Check-in: ${checkInMatch[1]}`);
    if (checkOutMatch) results.houseRules.push(`Checkout: ${checkOutMatch[1]}`);
    
    console.log(`  Found ${results.houseRules.length} rules`);
  }

  // Parse reviews if available
  if (data.reviewsSection?.html) {
    console.log('\n⭐ Reviews section found');
    const reviewsHtml = data.reviewsSection.html;
    // Extract review count
    const reviewCountMatch = reviewsHtml.match(/(\d+)\s*reviews?/i);
    if (reviewCountMatch) {
      results.reviews.count = parseInt(reviewCountMatch[1]);
      console.log(`  ${results.reviews.count} reviews`);
    }
  }

  // Calendar data
  if (data.calendarSection?.html) {
    console.log('\n📅 Calendar section found');
    results.calendar.found = true;
  }

  return results;
}

/**
 * Save results to file
 */
function saveResults(data, parsedData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, '../output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save raw response
  const rawFile = path.join(outputDir, `airbnb-raw-${timestamp}.json`);
  fs.writeFileSync(rawFile, JSON.stringify(data, null, 2));
  console.log(`\n💾 Raw data saved to: ${rawFile}`);

  // Save parsed data
  const parsedFile = path.join(outputDir, `airbnb-parsed-${timestamp}.json`);
  fs.writeFileSync(parsedFile, JSON.stringify(parsedData, null, 2));
  console.log(`💾 Parsed data saved to: ${parsedFile}`);

  // Save screenshot if available
  if (data?.screenshot?.base64) {
    const screenshotFile = path.join(outputDir, `airbnb-screenshot-${timestamp}.jpg`);
    const buffer = Buffer.from(data.screenshot.base64, 'base64');
    fs.writeFileSync(screenshotFile, buffer);
    console.log(`📸 Screenshot saved to: ${screenshotFile}`);
  }

  // Save full HTML for analysis
  if (data?.fullHtml?.html) {
    const htmlFile = path.join(outputDir, `airbnb-page-${timestamp}.html`);
    fs.writeFileSync(htmlFile, data.fullHtml.html);
    console.log(`📄 Full HTML saved to: ${htmlFile}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n========================================');
  console.log('🏠 Airbnb Property Scraper Test');
  console.log('========================================\n');

  const data = await executeScraping();
  
  if (data) {
    const parsedData = parseResponse(data);
    saveResults(data, parsedData);
    
    console.log('\n========================================');
    console.log('✅ Test completed successfully!');
    console.log('========================================');
    
    // Summary
    if (parsedData) {
      console.log('\n📊 Summary:');
      console.log(`  - Title: ${parsedData.basic.title || 'Not found'}`);
      console.log(`  - Price: ${parsedData.basic.price || 'Not found'}`);
      console.log(`  - Rating: ${parsedData.basic.rating || 'Not found'}`);
      console.log(`  - Sections: ${parsedData.sections.length} found`);
      console.log(`  - Amenities: ${parsedData.amenities.length} items`);
      console.log(`  - House Rules: ${parsedData.houseRules.length} rules`);
      console.log(`  - Reviews: ${parsedData.reviews.count || 'Not found'}`);
      console.log(`  - Calendar: ${parsedData.calendar.found ? 'Found' : 'Not found'}`);
    }
  } else {
    console.log('\n❌ Test failed - no data received');
  }
}

// Run the test
main().catch(console.error);