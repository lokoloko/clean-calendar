const fs = require('fs');
const pdfParse = require('pdf-parse');

async function checkNightsExtraction() {
  const yearPath = '/Users/richard/Desktop/test airbnb files/01_01_2024-12_31_2024_airbnb_earnings.pdf';
  const dataBuffer = fs.readFileSync(yearPath);
  const data = await pdfParse(dataBuffer);
  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('=== NIGHTS EXTRACTION PROBLEM ===\n');
  
  // Total nights from PDF
  console.log('TOTAL NIGHTS FROM PDF:');
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].toLowerCase() === 'nights booked') {
      console.log(`Total nights: ${lines[i + 1]}`);
      break;
    }
  }
  
  // Check property earnings
  console.log('\nPROPERTY EARNINGS (for reference):');
  console.log('-----------------------------------');
  const propertyLines = lines.filter(l => l.includes('$') && l.match(/^(Unit|Azusa|Monrovia|Glendora|L3)/));
  
  propertyLines.slice(0, 10).forEach(line => {
    const amounts = line.match(/\$[\d,]+\.?\d*/g);
    if (amounts && amounts.length >= 3) {
      const name = line.substring(0, line.indexOf('$'));
      const gross = amounts[0];
      const net = amounts[amounts.length - 1];
      console.log(`${name}: ${gross} gross → ${net} net`);
    }
  });
  
  console.log('\nPERFORMANCE STATS SECTION:');
  console.log('--------------------------');
  
  // Find the performance stats section
  let inStats = false;
  let statsLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('homenights booked')) {
      console.log(`Header at line ${i}: "${lines[i]}"`);
      inStats = true;
      continue;
    }
    
    if (inStats && (lines[i].startsWith('1 ') || lines[i].startsWith('2 '))) {
      break;
    }
    
    if (inStats && lines[i].length > 0) {
      statsLines.push(lines[i]);
      console.log(`"${lines[i]}"`);
    }
  }
  
  console.log('\n=== THE PROBLEM ===');
  console.log('-------------------');
  console.log('Performance stats format is ambiguous:');
  console.log('"Unit 1235.8" could mean:');
  console.log('  Option A: Unit 1, 235 nights, 8.0 avg stay (doesn\'t make sense)');
  console.log('  Option B: Unit 1, 23 nights, 5.8 avg stay (more reasonable)');
  console.log('  Option C: Unit 12, 35 nights, 8.0 avg stay (wrong property)');
  console.log('');
  console.log('Without the actual nightly rates or clear delimiters,');
  console.log('we CANNOT accurately parse individual property nights!');
  console.log('');
  console.log('CURRENT FALLBACK:');
  console.log('We estimate nights = gross_earnings / $150 (average rate guess)');
  console.log('This is VERY inaccurate and just a rough approximation.');
  
  // Show what our current parser would extract
  console.log('\n=== WHAT WE\'RE CURRENTLY EXTRACTING ===');
  statsLines.forEach(line => {
    // Try to match with known properties
    const knownProps = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit L1', 'Unit L2'];
    for (const prop of knownProps) {
      if (line.startsWith(prop)) {
        const remainder = line.substring(prop.length);
        if (remainder.includes('.')) {
          // Has decimal
          const beforeDot = remainder.substring(0, remainder.indexOf('.'));
          const afterDot = remainder.substring(remainder.indexOf('.'));
          
          // Our current logic takes last 2 digits as nights
          let nights = 0;
          if (beforeDot.length <= 2) {
            nights = parseInt(beforeDot);
          } else {
            nights = parseInt(beforeDot.substring(beforeDot.length - 2));
          }
          
          console.log(`${prop}: Extracting ${nights} nights from "${remainder}"`);
        }
        break;
      }
    }
  });
  
  console.log('\n⚠️  RECOMMENDATION:');
  console.log('The nights data for individual properties is NOT reliable.');
  console.log('We should either:');
  console.log('1. Hide the nights column for individual properties');
  console.log('2. Show a disclaimer that it\'s estimated');
  console.log('3. Only show the TOTAL nights which is accurate (3,645)');
}

checkNightsExtraction().catch(console.error);