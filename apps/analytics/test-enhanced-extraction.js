const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testEnhancedExtraction() {
  const yearPath = '/Users/richard/Desktop/test airbnb files/01_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  if (!fs.existsSync(yearPath)) {
    console.log('PDF not found');
    return;
  }
  
  const dataBuffer = fs.readFileSync(yearPath);
  const data = await pdfParse(dataBuffer);
  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('=== TESTING ENHANCED EXTRACTION ===\n');
  
  // Test summary line extraction
  console.log('1. SUMMARY LINE (Earnings row):');
  console.log('--------------------------------');
  const earningsLine = lines.find(l => l.startsWith('Earnings') && l.includes('$'));
  if (earningsLine) {
    console.log('Raw:', earningsLine);
    const amounts = earningsLine.match(/\$[\d,]+\.?\d*/g);
    if (amounts) {
      console.log('Parsed amounts:', amounts);
      console.log('  Gross:', amounts[0]);
      console.log('  Adjustments:', amounts[1]);
      console.log('  Service Fees:', amounts[2]);
      console.log('  Tax Withheld:', amounts[3]);
      console.log('  Net:', amounts[4]);
    }
  }
  
  // Test property line extraction
  console.log('\n2. SAMPLE PROPERTY LINES:');
  console.log('-------------------------');
  let propCount = 0;
  lines.forEach(line => {
    if (line.startsWith('Unit') && line.includes('$') && propCount < 3) {
      console.log('\nRaw:', line);
      const amounts = line.match(/\$[\d,]+\.?\d*/g);
      if (amounts) {
        console.log('Dollar amounts found:', amounts.length);
        amounts.forEach((amt, i) => {
          console.log(`  [${i}]: ${amt}`);
        });
      }
      propCount++;
    }
  });
  
  // Test monthly breakdown
  console.log('\n3. MONTHLY BREAKDOWN:');
  console.log('---------------------');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  months.forEach(month => {
    const monthLine = lines.find(l => l.startsWith(month) && l.includes('$'));
    if (monthLine) {
      const amounts = monthLine.match(/\$[\d,]+\.?\d*/g);
      if (amounts && amounts.length >= 2) {
        console.log(`${month}: Gross=${amounts[0]}, Net=${amounts[1]}`);
      }
    }
  });
  
  // Test tax extraction
  console.log('\n4. TAX CATEGORIES:');
  console.log('------------------');
  const taxLabels = ['adjustments', 'tax withheld', 'pass through tax', 
                     'host remitted tax', 'airbnb remitted tax', 'resolutions'];
  
  taxLabels.forEach(label => {
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].toLowerCase() === label) {
        console.log(`${label}: ${lines[i + 1]}`);
        break;
      }
    }
  });
  
  // Test payment methods
  console.log('\n5. PAYMENT METHODS:');
  console.log('-------------------');
  lines.forEach(line => {
    if (line.includes('(USD)$') && line.includes('Checking')) {
      const match = line.match(/^(.+?)\$/);
      if (match) {
        console.log('Found:', match[1].trim());
      }
    }
  });
  
  console.log('\n=== END OF TEST ===');
}

testEnhancedExtraction().catch(console.error);