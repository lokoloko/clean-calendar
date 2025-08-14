const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPropertyStats() {
  const pdfPath = '/Users/richard/Desktop/test airbnb files/12_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found:', pdfPath);
    return;
  }
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n');
  
  console.log('=== Lines 60-90 (Looking for property-specific stats) ===');
  for (let i = 60; i < Math.min(90, lines.length); i++) {
    console.log(`Line ${i}: "${lines[i].trim()}"`);
  }
  
  console.log('\n=== Extracting Property Stats ===');
  
  // Map to store property stats
  const propertyStats = new Map();
  
  // First get global avg
  let globalAvg = 6.7; // We know this from above
  
  // Look for property patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line contains property name with earnings data
    if (line.includes('$') && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('earnings')) {
      const dollarCount = (line.match(/\$/g) || []).length;
      if (dollarCount >= 5) {
        // Extract property name (everything before first $)
        const firstDollar = line.indexOf('$');
        const propName = line.substring(0, firstDollar);
        
        // Extract gross earnings (first $ amount)
        const amounts = line.match(/\$[\d,]+\.?\d*/g);
        if (amounts && amounts.length > 0) {
          const gross = parseFloat(amounts[0].replace(/[$,]/g, ''));
          if (gross > 0) {
            propertyStats.set(propName, {
              gross: gross,
              avgStay: globalAvg // Use global for now
            });
          }
        }
      }
    }
  }
  
  console.log('\nProperties found with earnings:');
  propertyStats.forEach((stats, name) => {
    console.log(`  ${name}: $${stats.gross}, avg stay: ${stats.avgStay}`);
  });
}

testPropertyStats().catch(console.error);