const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPDFParse() {
  const pdfPath = '/Users/richard/Desktop/test airbnb files/12_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found:', pdfPath);
    return;
  }
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n');
  console.log('Total lines:', lines.length);
  console.log('\n=== Looking for Average Stay Data ===\n');
  
  const avgStayMap = new Map();
  let inPerformanceStats = false;
  let currentProperty = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();
    
    // Check if we're entering performance stats section
    if (lower.includes('performance stats')) {
      inPerformanceStats = true;
      console.log(`Line ${i}: Found "Performance stats" section`);
      continue;
    }
    
    // Exit performance stats when we hit next major section
    if (inPerformanceStats && (lower.includes('earnings') || lower.includes('payout'))) {
      console.log(`Line ${i}: Exiting performance stats section`);
      break;
    }
    
    if (inPerformanceStats) {
      // Look for patterns with "avg" and numbers
      if (lower.includes('avg')) {
        console.log(`Line ${i}: "${line}"`);
        
        // Try to extract number near "avg"
        const avgMatch = line.match(/(\d+\.?\d*)\s*(?:nights?|avg|stay)/i);
        if (avgMatch) {
          const avgValue = parseFloat(avgMatch[1]);
          console.log(`  -> Extracted avg value: ${avgValue}`);
        }
      }
      
      // Look for property-specific stats like "Unit 1: 23 nights, 5.8 avg stay"
      const propertyMatch = line.match(/^([^:]+):\s*(\d+)\s*nights?,?\s*(\d+\.?\d*)\s*avg/i);
      if (propertyMatch) {
        const propName = propertyMatch[1].trim();
        const avgStay = parseFloat(propertyMatch[3]);
        avgStayMap.set(propName, avgStay);
        console.log(`Found property stats: "${propName}" -> ${avgStay} avg stay`);
      }
    }
    
    // Also check anywhere in document for avg stay patterns
    if (!inPerformanceStats && lower.includes('avg') && lower.includes('stay')) {
      console.log(`Line ${i} (outside stats): "${line}"`);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('Properties with avg stay data:', avgStayMap.size);
  avgStayMap.forEach((avg, prop) => {
    console.log(`  ${prop}: ${avg} nights avg`);
  });
  
  // Also show sample of property earnings lines
  console.log('\n=== Sample Property Lines with Dollar Amounts ===');
  for (let i = 0; i < Math.min(lines.length, 200); i++) {
    const line = lines[i].trim();
    if (line.includes('$') && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('summary')) {
      const dollarCount = (line.match(/\$/g) || []).length;
      if (dollarCount >= 3) {
        console.log(`Line ${i}: "${line.substring(0, 80)}..."  (${dollarCount} $ signs)`);
      }
    }
  }
}

testPDFParse().catch(console.error);