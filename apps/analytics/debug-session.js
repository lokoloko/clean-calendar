// Debug script to check what's in sessionStorage
// Run this in browser console after uploading PDF

console.log('=== Checking Session Storage ===');

const uploadData = sessionStorage.getItem('uploadData');
if (uploadData) {
  const data = JSON.parse(uploadData);
  console.log('Upload Data:', {
    totalRevenue: data.summary?.totalRevenue,
    totalNights: data.summary?.totalNights,
    properties: data.properties?.length,
    pdf: {
      totalNetEarnings: data.pdf?.totalNetEarnings,
      totalNightsBooked: data.pdf?.totalNightsBooked,
      period: data.pdf?.period,
      dateRange: data.pdf?.dateRange,
      propertiesCount: data.pdf?.properties?.length
    }
  });
}

const propertyMappings = sessionStorage.getItem('propertyMappings');
if (propertyMappings) {
  const mappings = JSON.parse(propertyMappings);
  const totalRevenue = mappings.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalNights = mappings.reduce((sum, p) => sum + (p.nightsBooked || 0), 0);
  console.log('Property Mappings:', {
    count: mappings.length,
    totalRevenue,
    totalNights,
    sample: mappings.slice(0, 3)
  });
}