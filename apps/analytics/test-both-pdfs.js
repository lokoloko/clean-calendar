const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPDF(pdfPath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${label}`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(pdfPath)) {
    console.log('❌ PDF file not found:', pdfPath);
    return;
  }
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Extract summary data
  let totalNights = 0;
  let totalEarnings = null;
  let avgStay = 0;
  let dateRange = '';
  
  // Look for key metrics
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    // Total nights
    if (line.toLowerCase() === 'nights booked' && /^\d+$/.test(nextLine)) {
      totalNights = parseInt(nextLine);
    }
    
    // Average stay
    if (line.toLowerCase() === 'avg night stay' && /^\d+\.?\d*$/.test(nextLine)) {
      avgStay = parseFloat(nextLine);
    }
    
    // Earnings line (has multiple $ amounts)
    if (line.includes('Earnings') && line.includes('$')) {
      const amounts = line.match(/\$[\d,]+\.?\d*/g);
      if (amounts && amounts.length >= 5) {
        // Last amount is usually the net total
        totalEarnings = amounts[amounts.length - 1];
      }
    }
  }
  
  // Count properties with earnings
  const properties = [];
  for (const line of lines) {
    if (line.includes('$') && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('earnings')) {
      const dollarCount = (line.match(/\$/g) || []).length;
      if (dollarCount >= 5) {
        const firstDollar = line.indexOf('$');
        const propName = line.substring(0, firstDollar).trim();
        const amounts = line.match(/\$[\d,]+\.?\d*/g);
        if (amounts && propName) {
          const gross = amounts[0];
          const net = amounts[amounts.length - 1];
          properties.push({ name: propName, gross, net });
        }
      }
    }
  }
  
  // Filter out properties with $0.00
  const activeProperties = properties.filter(p => p.net !== '$0.00');
  const inactiveProperties = properties.filter(p => p.net === '$0.00');
  
  console.log('\n📊 SUMMARY METRICS:');
  console.log('-------------------');
  console.log(`Total Net Earnings: ${totalEarnings || 'Not found'}`);
  console.log(`Total Nights Booked: ${totalNights}`);
  console.log(`Average Stay: ${avgStay} nights`);
  console.log(`Total Properties: ${properties.length}`);
  console.log(`Active Properties: ${activeProperties.length}`);
  console.log(`Inactive Properties: ${inactiveProperties.length}`);
  
  console.log('\n🏠 ACTIVE PROPERTIES:');
  console.log('--------------------');
  activeProperties.forEach(p => {
    console.log(`${p.name.padEnd(30)} Gross: ${p.gross.padEnd(12)} Net: ${p.net}`);
  });
  
  console.log('\n💤 INACTIVE PROPERTIES:');
  console.log('----------------------');
  inactiveProperties.forEach(p => {
    console.log(`${p.name}`);
  });
  
  // Extract property-specific nights from performance stats
  console.log('\n📈 PERFORMANCE STATS (if available):');
  console.log('-----------------------------------');
  let inPerfStats = false;
  let propertyNights = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.toLowerCase().includes('homenights booked')) {
      inPerfStats = true;
      continue;
    }
    
    if (inPerfStats && (line.startsWith('1 ') || line.startsWith('2 '))) {
      break;
    }
    
    if (inPerfStats && line.length > 0) {
      const firstDigit = line.search(/\d/);
      if (firstDigit > 0) {
        const propName = line.substring(0, firstDigit).trim();
        const numbers = line.substring(firstDigit);
        
        // Parse nights and avg stay
        if (numbers.includes('.')) {
          // Format: "235.8" = 23 nights, 5.8 avg
          const match = numbers.match(/(\d+)(\d+\.?\d*)/);
          if (match) {
            const nights = parseInt(match[1]);
            propertyNights += nights;
            console.log(`${propName.padEnd(30)} ${nights} nights`);
          }
        } else if (numbers !== '00') {
          // Format: "84" = 8 nights, 4 avg
          const nights = parseInt(numbers.substring(0, numbers.length - 1));
          if (!isNaN(nights)) {
            propertyNights += nights;
            console.log(`${propName.padEnd(30)} ${nights} nights`);
          }
        }
      }
    }
  }
  
  if (propertyNights > 0) {
    console.log(`\nSum of property nights: ${propertyNights}`);
    if (propertyNights !== totalNights) {
      console.log(`⚠️  Warning: Sum (${propertyNights}) doesn't match total (${totalNights})`);
    }
  }
  
  return {
    totalEarnings,
    totalNights,
    avgStay,
    totalProperties: properties.length,
    activeProperties: activeProperties.length,
    inactiveProperties: inactiveProperties.length
  };
}

async function compareResults() {
  // Test monthly PDF
  const monthlyPath = '/Users/richard/Desktop/test airbnb files/12_01_2024-12_31_2024_airbnb_earnings.pdf';
  const monthlyResults = await testPDF(monthlyPath, 'DECEMBER 2024 (Monthly)');
  
  // Test full year PDF
  const yearPath = '/Users/richard/Desktop/test airbnb files/01_01_2024-12_31_2024_airbnb_earnings.pdf';
  const yearResults = await testPDF(yearPath, 'FULL YEAR 2024');
  
  // Summary comparison
  console.log('\n' + '='.repeat(60));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n📊 Key Metrics Comparison:');
  console.log('-------------------------');
  console.log('                    December 2024    Full Year 2024');
  console.log('                    -------------    --------------');
  if (monthlyResults && yearResults) {
    console.log(`Total Revenue:      ${(monthlyResults.totalEarnings || '').padEnd(15)} ${yearResults.totalEarnings || ''}`);
    console.log(`Total Nights:       ${String(monthlyResults.totalNights).padEnd(15)} ${yearResults.totalNights}`);
    console.log(`Avg Stay:           ${String(monthlyResults.avgStay).padEnd(15)} ${yearResults.avgStay}`);
    console.log(`Active Properties:  ${String(monthlyResults.activeProperties).padEnd(15)} ${yearResults.activeProperties}`);
    console.log(`Total Properties:   ${String(monthlyResults.totalProperties).padEnd(15)} ${yearResults.totalProperties}`);
  }
  
  console.log('\n✅ Test complete! Upload these PDFs to the dashboard and verify these numbers match.');
}

compareResults().catch(console.error);