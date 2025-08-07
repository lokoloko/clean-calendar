const fs = require('fs');
const Papa = require('papaparse');

// Read July CSV
const july = fs.readFileSync('/Users/richard/Desktop/test airbnb files/ac6f5c85-5285-48f5-96c3-6640a4349cd5.csv', 'utf8');
const august = fs.readFileSync('/Users/richard/Desktop/test airbnb files/b0d0b244-7dcf-4713-baa4-08c8e4ee8384.csv', 'utf8');

console.log('=== AIRBNB PERFORMANCE CSV ANALYSIS ===\n');

function parseCSV(csvText, month) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  console.log(`\n${month} Data:`);
  console.log('----------------');
  
  let totalNights = 0;
  let totalBookings = 0;
  const properties = [];
  
  parsed.data.forEach(row => {
    if (row['Internal name'] && row['Nights booked']) {
      const nights = parseFloat(row['Nights booked']) || 0;
      const avgStay = parseFloat(row['Average length of stay']) || 0;
      const dailyRate = parseFloat(row['Average daily rate']) || 0;
      const bookingValue = parseFloat(row['Booking value']) || 0;
      
      if (nights > 0) {
        console.log(`${row['Internal name']}:`);
        console.log(`  Nights: ${nights}`);
        console.log(`  Avg Stay: ${avgStay}`);
        console.log(`  Daily Rate: $${dailyRate.toFixed(2)}`);
        console.log(`  Revenue: $${bookingValue.toFixed(2)}`);
        
        totalNights += nights;
        properties.push({
          name: row['Internal name'],
          nights,
          avgStay,
          dailyRate,
          revenue: bookingValue
        });
      }
    }
  });
  
  console.log(`\nTotal nights for ${month}: ${totalNights}`);
  
  return { totalNights, properties };
}

const julyData = parseCSV(july, 'July 2025');
const augustData = parseCSV(august, 'August 1-5, 2025');

console.log('\n=== SUMMARY ===');
console.log(`Total nights from CSVs: ${julyData.totalNights + augustData.totalNights}`);
console.log('\nThis is REAL data from Airbnb Performance Reports:');
console.log('✅ Exact nights per property');
console.log('✅ Exact average stay per property');
console.log('✅ Actual daily rates');
console.log('✅ No parsing ambiguity!');

// Compare with PDF parsing problem
console.log('\n=== COMPARISON WITH PDF PROBLEM ===');
console.log('PDF format: "Unit 133210.4" (impossible to parse accurately)');
console.log('CSV format: Separate columns for each metric!');
console.log('');
console.log('Example - Unit 1:');
const unit1July = julyData.properties.find(p => p.name === 'Unit 1');
if (unit1July) {
  console.log(`  CSV says: ${unit1July.nights} nights, ${unit1July.avgStay} avg stay`);
  console.log(`  PDF concat: "Unit 1${unit1July.nights}${unit1July.avgStay}" would be ambiguous`);
}