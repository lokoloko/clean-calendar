const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPDFDetail() {
  const pdfPath = '/Users/richard/Desktop/test airbnb files/12_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found:', pdfPath);
    return;
  }
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n');
  
  console.log('=== Lines 15-30 (Around Performance Stats) ===');
  for (let i = 15; i < Math.min(30, lines.length); i++) {
    console.log(`Line ${i}: "${lines[i].trim()}"`);
  }
  
  console.log('\n=== Looking for numbers after "Avg night stay" ===');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
    
    if (line.toLowerCase().includes('avg') && line.toLowerCase().includes('stay')) {
      console.log(`Found at line ${i}: "${line}"`);
      console.log(`Next line ${i + 1}: "${nextLine}"`);
      
      // Check if next line has a number
      const numberMatch = nextLine.match(/^(\d+\.?\d*)$/);
      if (numberMatch) {
        console.log(`  -> Found avg stay value: ${numberMatch[1]}`);
      }
    }
    
    // Also look for "nights" followed by a number
    if (line.toLowerCase() === 'nights') {
      console.log(`Found "nights" at line ${i}`);
      console.log(`Next line ${i + 1}: "${nextLine}"`);
    }
  }
  
  console.log('\n=== All lines with numbers only ===');
  for (let i = 0; i < Math.min(60, lines.length); i++) {
    const line = lines[i].trim();
    if (/^\d+\.?\d*$/.test(line)) {
      console.log(`Line ${i}: "${line}" (previous: "${lines[i-1] ? lines[i-1].trim() : ''}")`);
    }
  }
}

testPDFDetail().catch(console.error);