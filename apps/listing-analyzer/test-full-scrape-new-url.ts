import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

// New URL - direct to reviews page
const TEST_URL = 'https://www.airbnb.com/rooms/645598452510568412';
const REVIEWS_URL = 'https://www.airbnb.com/rooms/645598452510568412/reviews?check_in=2025-09-16&check_out=2025-09-30&photo_id=1419543992&source_impression_id=p3_1754864929_P3JETdLqfqA-dx5d&previous_page_section_name=1000';

async function testFullScrape() {
  console.log('🚀 Testing Full Scrape on New Airbnb Listing\n');
  console.log('Listing URL:', TEST_URL);
  console.log('Reviews URL:', REVIEWS_URL);
  console.log('═'.repeat(80) + '\n');

  try {
    // First, try the hybrid scraper if it exists
    console.log('📊 Method 1: Testing Hybrid Scraper\n');
    try {
      const { scrapeAirbnbHybrid } = await import('./lib/scraper-hybrid');
      const result = await scrapeAirbnbHybrid(TEST_URL);
      
      console.log('✅ Hybrid Scraper Results:');
      console.log('  Data Completeness:', result.listing.meta?.dataCompleteness + '%');
      console.log('  Best Method:', result.bestMethod);
      console.log('  Total Time:', result.totalTime + 'ms');
      
      // Save results
      await fs.writeFile(
        'hybrid-scraper-results.json',
        JSON.stringify(result, null, 2)
      );
      console.log('  💾 Saved to hybrid-scraper-results.json\n');
      
      // Display key data
      if (result.listing.reviews) {
        console.log('  📝 Reviews Data:');
        console.log('    Rating:', result.listing.reviews.rating);
        console.log('    Total Count:', result.listing.reviews.totalCount);
        console.log('    Guest Favorite:', result.listing.reviews.guestFavorite);
        if (result.listing.reviews.categories) {
          console.log('    Categories:', result.listing.reviews.categories);
        }
      }
    } catch (error) {
      console.log('❌ Hybrid scraper error:', error.message);
    }

    // Test the review-specific scraper
    console.log('\n' + '─'.repeat(80));
    console.log('\n📊 Method 2: Testing Review-Specific Scraper\n');
    try {
      const { extractReviewsWithScreenshots } = await import('./lib/scraper-reviews-isolated');
      const reviewResult = await extractReviewsWithScreenshots(REVIEWS_URL);
      
      console.log('✅ Review Scraper Results:');
      console.log('  Success:', reviewResult.success);
      console.log('  Screenshots Taken:', reviewResult.screenshots.length);
      console.log('  Reviews Found:', reviewResult.reviews.length);
      console.log('  Rating:', reviewResult.rating);
      console.log('  Total Reviews:', reviewResult.totalReviews);
      
      // Save results
      await fs.writeFile(
        'review-scraper-results.json',
        JSON.stringify({
          ...reviewResult,
          screenshots: reviewResult.screenshots.map((s, i) => `screenshot_${i}.jpg`)
        }, null, 2)
      );
      
      // Save screenshots
      for (let i = 0; i < reviewResult.screenshots.length; i++) {
        await fs.writeFile(
          `review-screenshot-${i}.jpg`,
          Buffer.from(reviewResult.screenshots[i], 'base64')
        );
      }
      
      console.log(`  💾 Saved ${reviewResult.screenshots.length} screenshots`);
      console.log('  💾 Saved results to review-scraper-results.json\n');
      
      // Display execution logs
      if (reviewResult.logs.length > 0) {
        console.log('  📝 Execution Logs:');
        reviewResult.logs.slice(-5).forEach(log => {
          console.log('    -', log);
        });
      }
    } catch (error) {
      console.log('❌ Review scraper error:', error.message);
    }

    // Test the rating extraction only
    console.log('\n' + '─'.repeat(80));
    console.log('\n📊 Method 3: Testing Rating Extraction with Vision AI\n');
    try {
      const { extractRatingsOnly } = await import('./lib/extract-ratings-only');
      const ratingResult = await extractRatingsOnly(TEST_URL);
      
      console.log('✅ Rating Extraction Results:');
      console.log('  Success:', ratingResult.success);
      console.log('  Rating:', ratingResult.rating);
      console.log('  Total Reviews:', ratingResult.totalCount);
      console.log('  Guest Favorite:', ratingResult.guestFavorite);
      console.log('  Categories:', ratingResult.categories);
      
      await fs.writeFile(
        'rating-extraction-results.json',
        JSON.stringify(ratingResult, null, 2)
      );
      console.log('  💾 Saved to rating-extraction-results.json');
      
    } catch (error) {
      console.log('❌ Rating extraction error:', error.message);
    }

    // Test screenshot capture
    console.log('\n' + '─'.repeat(80));
    console.log('\n📸 Method 4: Testing Screenshot Capture\n');
    
    const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY || '';
    const endpoint = `https://production-sfo.browserless.io/screenshot?token=${BROWSERLESS_KEY}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: REVIEWS_URL,
          options: {
            fullPage: false,
            type: 'jpeg',
            quality: 90
          },
          gotoOptions: {
            waitUntil: 'networkidle2'
          },
          viewport: {
            width: 1920,
            height: 1080
          }
        })
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        await fs.writeFile('direct-reviews-screenshot.jpg', Buffer.from(buffer));
        console.log('✅ Screenshot captured successfully');
        console.log('  💾 Saved to direct-reviews-screenshot.jpg');
        console.log('  📝 This is the reviews URL directly - may show modal open');
      } else {
        console.log('❌ Screenshot failed:', await response.text());
      }
    } catch (error) {
      console.log('❌ Screenshot error:', error.message);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ All tests complete\n');
  console.log('Files created:');
  console.log('  - hybrid-scraper-results.json');
  console.log('  - review-scraper-results.json');
  console.log('  - rating-extraction-results.json');
  console.log('  - direct-reviews-screenshot.jpg');
  console.log('  - review-screenshot-*.jpg (if reviews were found)');
}

// Run the test
testFullScrape().catch(console.error);