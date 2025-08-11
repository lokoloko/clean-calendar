import { scrapeWithEnhancedFunction } from './lib/scraper-enhanced-function';

const TEST_URL = 'https://www.airbnb.com/rooms/645598452510568412';

async function testNewListing() {
  console.log('🚀 Testing Full Scrape on New Listing');
  console.log('URL:', TEST_URL);
  console.log('═'.repeat(80) + '\n');

  try {
    const result = await scrapeWithEnhancedFunction(TEST_URL);
    
    console.log('✅ Extraction Complete!');
    console.log('Data Completeness:', result.meta?.dataCompleteness + '%');
    console.log('Modals Captured:', result.meta?.modalsCaptured);
    
    console.log('\n🏠 Property Info:');
    console.log('  Title:', result.title);
    console.log('  Type:', result.propertyType);
    console.log('  Host:', result.host?.name, result.host?.isSuperhost ? '(Superhost)' : '');
    console.log('  Location:', result.location?.city);
    
    console.log('\n📊 Spaces:');
    console.log('  Bedrooms:', result.spaces?.bedrooms);
    console.log('  Beds:', result.spaces?.beds);
    console.log('  Bathrooms:', result.spaces?.bathrooms);
    console.log('  Guests:', result.guestCapacity?.total);
    
    console.log('\n💰 Pricing:');
    console.log('  Base Price:', `$${result.pricing?.basePrice}`);
    console.log('  Cleaning Fee:', `$${result.pricing?.cleaningFee}`);
    console.log('  Service Fee:', `$${result.pricing?.serviceFee}`);
    
    console.log('\n⭐ Reviews & Ratings:');
    console.log('  Overall Rating:', result.reviews?.rating);
    console.log('  Total Reviews:', result.reviews?.totalCount);
    console.log('  Guest Favorite:', result.reviews?.guestFavorite ? '✅' : '❌');
    
    if (result.reviews?.categories) {
      console.log('  Category Ratings:');
      Object.entries(result.reviews.categories).forEach(([category, rating]) => {
        console.log(`    - ${category.charAt(0).toUpperCase() + category.slice(1)}: ${rating}`);
      });
    }
    
    if (result.reviews?.distribution) {
      console.log('  Rating Distribution:');
      Object.entries(result.reviews.distribution).forEach(([stars, count]) => {
        const percentage = Math.round((count as number / result.reviews.totalCount) * 100);
        console.log(`    ${stars} stars: ${count} (${percentage}%)`);
      });
    }
    
    if (result.reviews?.recentReviews && result.reviews.recentReviews.length > 0) {
      console.log('\n  Recent Reviews:');
      result.reviews.recentReviews.slice(0, 3).forEach((review, idx) => {
        console.log(`    ${idx + 1}. ${review.reviewer} (${review.date}):`);
        console.log(`       "${review.text?.substring(0, 100)}..."`);
      });
    }
    
    console.log('\n🏠 Amenities:');
    const allAmenities = [
      ...(result.amenities?.basic || []),
      ...(result.amenities?.safety || []),
      ...(result.amenities?.kitchen || []),
      ...(result.amenities?.bathroom || []),
      ...(result.amenities?.bedroom || []),
      ...(result.amenities?.outdoor || []),
      ...(result.amenities?.entertainment || []),
      ...(result.amenities?.other || [])
    ];
    console.log('  Total:', allAmenities.length, 'amenities');
    if (allAmenities.length > 0) {
      console.log('  Sample:', allAmenities.slice(0, 5).join(', ') + '...');
    }
    
    console.log('\n📋 Policies:');
    console.log('  Check-in:', result.houseRules?.checkIn?.time || 'Not specified');
    console.log('  Check-out:', result.houseRules?.checkOut?.time || 'Not specified');
    console.log('  Cancellation:', result.cancellationPolicy?.type || 'Not specified');
    console.log('  House Rules:', result.houseRules?.during?.smoking === false ? 'No smoking' : 'See listing');
    console.log('  Pets:', result.houseRules?.during?.petsAllowed ? 'Allowed' : 'Not allowed');
    
    // Save full results
    const fs = await import('fs/promises');
    await fs.writeFile(
      'new-listing-full-results.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n💾 Full results saved to new-listing-full-results.json');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testNewListing().catch(console.error);