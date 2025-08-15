// Debug script to trace the exact save flow

const uploadData = {
  properties: [
    {
      name: "Test Property",
      revenue: 50000,  // CSV field
      nightsBooked: 100,
      hasAccurateMetrics: true
    }
  ],
  csv: {
    propertyMetrics: [
      {
        name: "Test Property",
        totalRevenue: 50000,
        totalNights: 100,
        avgStayLength: 3.5
      }
    ],
    dateRange: {
      start: "2024-01-01",
      end: "2024-12-31"
    }
  }
};

console.log("=== DEBUG SAVE FLOW ===\n");

// 1. What mapping page creates
const mappedProp = uploadData.properties[0];
const mappedRevenue = mappedProp.revenue || mappedProp.netEarnings || 0;
console.log("1. Mapped property revenue:", mappedRevenue);

// 2. What gets sent to database
const hasFinancialData = mappedProp.netEarnings !== undefined || mappedProp.revenue !== undefined;
console.log("2. Has financial data?", hasFinancialData);
console.log("   - netEarnings:", mappedProp.netEarnings);
console.log("   - revenue:", mappedProp.revenue);

// 3. What PDF data source would contain
if (hasFinancialData) {
  const pdfData = {
    totalNetEarnings: mappedProp.revenue || mappedProp.netEarnings || 0,
    totalNightsBooked: mappedProp.nightsBooked || 0
  };
  console.log("3. PDF data source created:", pdfData);
}

// 4. CSV metrics assignment
const standardName = mappedProp.name;
const thisPropertyMetrics = uploadData.csv.propertyMetrics.find(
  m => m.name === standardName
);
console.log("4. CSV metrics found?", !!thisPropertyMetrics);
if (thisPropertyMetrics) {
  console.log("   - Revenue from CSV:", thisPropertyMetrics.totalRevenue);
  console.log("   - Nights from CSV:", thisPropertyMetrics.totalNights);
}

console.log("\n✅ With our fixes, revenue should be:", mappedRevenue);