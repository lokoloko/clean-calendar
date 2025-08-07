// Smarter parsing approach
const testCases = [
  { line: "Unit 133210.4", knownProperty: "Unit 1", earnings: 37899.55 },
  { line: "Unit 23216.4", knownProperty: "Unit 2", earnings: 35184.05 },
  { line: "Unit 33166.2", knownProperty: "Unit 3", earnings: 26088.60 },
  { line: "Unit 4307.5", knownProperty: "Unit 4", earnings: 3201.20 },
  { line: "Unit L120512.8", knownProperty: "Unit L1", earnings: 20000 }, // estimate
  { line: "Unit A33816.1", knownProperty: "Unit A", earnings: 25000 }, // estimate
];

console.log("=== SMART PARSING SOLUTION ===\n");

function parsePerformanceStats(line, propertyName) {
  // Remove the known property name
  const numbers = line.substring(propertyName.length);
  
  if (!numbers.includes('.')) {
    // No decimal means no bookings (e.g., "00")
    return { nights: 0, avgStay: 0 };
  }
  
  // Split at decimal point
  const [beforeDot, afterDot] = numbers.split('.');
  
  // The trick: The LAST 1-2 digits before the dot are part of the avg stay!
  // This is because avg stay is typically 1-30 nights
  
  let nights, avgStayInt;
  
  // If afterDot is a single digit, avg stay is likely X.Y format (e.g., 8.1)
  // If beforeDot ends with 1-3, those are likely part of avg stay
  
  if (beforeDot.length <= 2) {
    // Short number, all of it is avg stay integer part
    nights = 0;
    avgStayInt = beforeDot;
  } else {
    // Heuristic: avg stay is typically 1-30
    // So we take 1 or 2 digits from the end
    
    // Check if last 2 digits make sense as avg stay
    const last2 = parseInt(beforeDot.slice(-2));
    const last1 = parseInt(beforeDot.slice(-1));
    
    if (last2 <= 30 && last2 > 0 && beforeDot.length > 2) {
      // Use last 2 digits for avg stay
      nights = parseInt(beforeDot.slice(0, -2));
      avgStayInt = last2;
    } else {
      // Use last 1 digit for avg stay
      nights = parseInt(beforeDot.slice(0, -1));
      avgStayInt = last1;
    }
  }
  
  const avgStay = parseFloat(avgStayInt + '.' + afterDot);
  
  return { nights, avgStay };
}

console.log("Property Name Matching + Smart Splitting:");
console.log("-----------------------------------------");

let totalNights = 0;
testCases.forEach(test => {
  const result = parsePerformanceStats(test.line, test.knownProperty);
  const impliedRate = test.earnings > 0 ? test.earnings / result.nights : 0;
  
  console.log(`${test.knownProperty}:`);
  console.log(`  Input: "${test.line}"`);
  console.log(`  Parsed: ${result.nights} nights, ${result.avgStay} avg stay`);
  if (impliedRate > 0) {
    console.log(`  Implied rate: $${impliedRate.toFixed(2)}/night`);
    const reasonable = impliedRate >= 50 && impliedRate <= 300;
    console.log(`  Rate reasonable? ${reasonable ? '✓' : '✗'}`);
  }
  
  totalNights += result.nights;
});

console.log(`\nTotal nights parsed: ${totalNights}`);
console.log(`Target total: 3,645`);
console.log(`Difference: ${Math.abs(3645 - totalNights)}`);

console.log("\n=== ALTERNATIVE: CSV DATA ===");
console.log("-----------------------------");
console.log("If users have transaction CSV exports, those contain:");
console.log("- Exact check-in/check-out dates");
console.log("- Property names");
console.log("- Actual nightly rates");
console.log("This would give 100% accurate data!");