const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testFullYearPDF() {
  const pdfPath = '/Users/richard/Desktop/test airbnb files/01_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found:', pdfPath);
    return;
  }
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n');
  console.log('Total lines:', lines.length);
  
  console.log('\n=== Looking for Summary Data ===');
  
  // Look for total nights and other key metrics
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
    
    // Look for "Nights booked" followed by a number
    if (line.toLowerCase() === 'nights booked') {
      console.log(`Line ${i}: "${line}"`);
      console.log(`Line ${i + 1}: "${nextLine}"`);
      console.log('=> Total nights booked:', nextLine);
    }
    
    // Look for earnings totals
    if (line.includes('Earnings') && line.includes('$')) {
      console.log(`Line ${i}: "${line}"`);
    }
    
    // Look for date range
    if (line.includes('2024') && (line.includes('Jan') || line.includes('Dec') || line.includes('-'))) {
      console.log(`Line ${i}: "${line}" (possible date range)`);
    }
  }
  
  console.log('\n=== Property Data Sample ===');
  // Show properties with earnings
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('$') && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('earnings')) {
      const dollarCount = (line.match(/\$/g) || []).length;
      if (dollarCount >= 5) {
        console.log(`Property line: "${line.substring(0, 100)}..."`);
      }
    }
  }
  
  console.log('\n=== Performance Stats Section ===');
  let inPerfStats = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.toLowerCase().includes('performance stats')) {
      inPerfStats = true;
      console.log(`Line ${i}: Starting performance stats section`);
    }
    
    if (inPerfStats) {
      console.log(`Line ${i}: "${line}"`);
      
      // Stop after a few lines
      if (i > lines.findIndex(l => l.toLowerCase().includes('performance stats')) + 10) {
        break;
      }
    }
  }
}

testFullYearPDF().catch(console.error);