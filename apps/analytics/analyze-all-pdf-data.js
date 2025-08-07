const fs = require('fs');
const pdfParse = require('pdf-parse');

async function analyzePDF() {
  const pdfPath = '/Users/richard/Desktop/test airbnb files/01_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF not found, trying monthly...');
    pdfPath = '/Users/richard/Desktop/test airbnb files/12_01_2024-12_31_2024_airbnb_earnings.pdf';
  }
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('=== ANALYZING ALL DATA POINTS IN PDF ===\n');
  console.log('Total lines:', lines.length);
  console.log('\n');
  
  // Look for all numeric patterns and labels
  const patterns = {
    currency: /\$[\d,]+\.?\d*/g,
    percentages: /\d+\.?\d*%/g,
    decimals: /\d+\.\d+/g,
    integers: /\b\d{2,}\b/g,
    dates: /\d{1,2}\/\d{1,2}\/\d{2,4}/g
  };
  
  // Find all unique labels (lines before numbers)
  const labels = new Set();
  const dataPoints = new Map();
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    // If next line has a number or currency, current line might be a label
    if (nextLine && (nextLine.match(/^[\d,\.\$]+/) || nextLine.match(/^\d+$/))) {
      if (!line.includes('$') && line.length < 50 && line.length > 2) {
        labels.add(line);
        dataPoints.set(line, nextLine);
      }
    }
  }
  
  console.log('KEY DATA POINTS WITH VALUES:');
  console.log('----------------------------');
  for (const [label, value] of dataPoints) {
    console.log(`${label}: ${value}`);
  }
  
  // Look for specific sections
  console.log('\n\nSECTION HEADERS FOUND:');
  console.log('----------------------');
  lines.forEach(line => {
    if (line.match(/^[A-Z][A-Z\s]+$/) && line.length > 5 && line.length < 50) {
      console.log('- ' + line);
    }
  });
  
  // Find lines with multiple dollar amounts (transaction details)
  console.log('\n\nTRANSACTION BREAKDOWN LINES:');
  console.log('-----------------------------');
  let sampleCount = 0;
  lines.forEach((line, i) => {
    const dollarCount = (line.match(/\$/g) || []).length;
    if (dollarCount >= 3 && !line.toLowerCase().includes('total') && sampleCount < 5) {
      console.log(line);
      sampleCount++;
    }
  });
  
  // Find lines with percentages
  console.log('\n\nPERCENTAGE DATA:');
  console.log('----------------');
  lines.forEach((line, i) => {
    if (line.includes('%')) {
      console.log(line);
    }
  });
  
  // Find date ranges
  console.log('\n\nDATE INFORMATION:');
  console.log('-----------------');
  lines.forEach((line, i) => {
    if (line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) || 
        line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/)) {
      console.log(line);
    }
  });
  
  // Look for reservation/booking details
  console.log('\n\nRESERVATION/BOOKING PATTERNS:');
  console.log('-----------------------------');
  lines.forEach((line, i) => {
    if (line.match(/reservation|booking|guest|check|stay/i)) {
      console.log(`Line ${i}: ${line.substring(0, 100)}`);
    }
  });
  
  // Look for tax information
  console.log('\n\nTAX RELATED DATA:');
  console.log('-----------------');
  lines.forEach((line, i) => {
    if (line.match(/tax|VAT|withh/i)) {
      console.log(`Line ${i}: ${line}`);
    }
  });
  
  // Find adjustments or special items
  console.log('\n\nADJUSTMENTS/SPECIAL ITEMS:');
  console.log('--------------------------');
  lines.forEach((line, i) => {
    if (line.match(/adjustment|credit|refund|resolution|cancellation|penalty/i)) {
      console.log(`Line ${i}: ${line}`);
    }
  });
  
  // Look for occupancy or rate data
  console.log('\n\nOCCUPANCY/RATE DATA:');
  console.log('--------------------');
  lines.forEach((line, i) => {
    if (line.match(/occupancy|rate|price|nightly/i)) {
      console.log(`Line ${i}: ${line.substring(0, 100)}`);
    }
  });
}

analyzePDF().catch(console.error);