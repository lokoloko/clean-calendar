// Let's analyze the patterns we have to find a solution
const data = [
  { line: "Unit 133210.4", property: "Unit 1", earnings: 37899.55 },
  { line: "Unit 23216.4", property: "Unit 2", earnings: 35184.05 },
  { line: "Unit 33166.2", property: "Unit 3", earnings: 26088.60 },
  { line: "Unit 4307.5", property: "Unit 4", earnings: 3201.20 },
  { line: "Unit A33816.1", property: "Unit A", earnings: 0 }, // Need to check
  { line: "Unit C2628.2", property: "Unit C", earnings: 0 },
  { line: "Unit L120512.8", property: "Unit L1", earnings: 0 },
  { line: "Unit L23168.1", property: "Unit L2", earnings: 0 },
  { line: "Azusa E - Sunrise Getaway1718.1", property: "Azusa E - Sunrise Getaway", earnings: 0 },
  { line: "Monrovia A1359.6", property: "Monrovia A", earnings: 0 }
];

console.log("=== PATTERN ANALYSIS ===\n");

// Strategy 1: Use known property names to split
console.log("STRATEGY 1: Known Property Names");
console.log("---------------------------------");
data.forEach(item => {
  const remainder = item.line.substring(item.property.length);
  console.log(`${item.property}: "${remainder}"`);
  
  // Parse the remainder
  if (remainder.includes('.')) {
    const parts = remainder.split('.');
    const beforeDot = parts[0];
    const afterDot = parts[1];
    
    // The last digit before dot is part of avg stay
    // Everything else is nights
    const lastDigit = beforeDot[beforeDot.length - 1];
    const nights = beforeDot.substring(0, beforeDot.length - 1);
    const avgStay = lastDigit + '.' + afterDot;
    
    console.log(`  Parsed: ${nights} nights, ${avgStay} avg stay`);
    
    // Validate with earnings
    if (item.earnings > 0 && nights) {
      const impliedRate = item.earnings / parseInt(nights);
      console.log(`  Implied nightly rate: $${impliedRate.toFixed(2)}`);
    }
  }
  console.log();
});

// Strategy 2: Constraint-based parsing
console.log("\nSTRATEGY 2: Reasonable Constraints");
console.log("-----------------------------------");
console.log("Constraints:");
console.log("- Avg stay typically 1-30 nights");
console.log("- Total nights should sum close to 3,645");
console.log("- Higher earnings = more nights");
console.log("- Nightly rates typically $50-200");

// Calculate what makes sense
const unit1 = { 
  option1: { nights: 332, avg: 10.4, rate: 37899.55/332 }, // $114/night
  option2: { nights: 33, avg: 210.4, rate: 37899.55/33 }   // $1148/night - too high\!
};

console.log("\nUnit 1 options:");
console.log("Option 1: 332 nights, 10.4 avg = $114/night ✓ REASONABLE");
console.log("Option 2: 33 nights, 210.4 avg = $1148/night ✗ TOO HIGH");

console.log("\n=== SOLUTION ===");
console.log("We CAN parse this by:");
console.log("1. Using exact property names from earnings section");
console.log("2. Splitting at decimal point");
console.log("3. Taking last digit before decimal as part of avg stay");
console.log("4. Validating with reasonable rate constraints ($50-200/night)");
