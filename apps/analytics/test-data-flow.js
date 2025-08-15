const fs = require('fs');

// Simulate what the CSV parser returns
const csvPropertyMetrics = [
  { name: "Unit 1", totalRevenue: 41193.88, totalNights: 123, avgStayLength: 3.2 },
  { name: "Unit 2", totalRevenue: 35678.50, totalNights: 98, avgStayLength: 2.8 },
  { name: "Unit 3", totalRevenue: 28456.25, totalNights: 87, avgStayLength: 3.5 }
];

// What /api/upload returns
const apiResponse = {
  properties: csvPropertyMetrics.map(metric => ({
    name: metric.name,
    revenue: metric.totalRevenue,  // Individual property revenue
    nightsBooked: metric.totalNights,
    avgNightStay: metric.avgStayLength,
    hasAccurateMetrics: true
  }))
};

console.log("1. API Response properties:");
apiResponse.properties.forEach(p => {
  console.log(`   ${p.name}: revenue=${p.revenue}, nights=${p.nightsBooked}`);
});

// What mapping page stores in processedData
const processedData = {
  ...apiResponse,
  totalRevenue: apiResponse.properties.reduce((sum, p) => sum + p.revenue, 0),
  totalNights: apiResponse.properties.reduce((sum, p) => sum + p.nightsBooked, 0)
};

console.log("\n2. ProcessedData stored by mapping page:");
console.log(`   Total Revenue: ${processedData.totalRevenue}`);
console.log(`   Total Nights: ${processedData.totalNights}`);
console.log(`   Properties[0].revenue: ${processedData.properties[0].revenue}`);

// What properties page converts to
const sessionProperties = processedData.properties.map(prop => ({
  name: prop.name,
  metrics: {
    revenue: { value: prop.revenue || 0 }  // Should use prop.revenue
  }
}));

console.log("\n3. Properties page conversion:");
sessionProperties.forEach(p => {
  console.log(`   ${p.name}: metrics.revenue.value=${p.metrics.revenue.value}`);
});

console.log("\n✅ Each property should have its individual revenue, not the total\!");
