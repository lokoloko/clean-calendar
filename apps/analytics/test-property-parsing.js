const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPropertyParsing() {
  const pdfPath = '/Users/richard/Desktop/test airbnb files/12_01_2024-12_31_2024_airbnb_earnings.pdf';
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('Looking for Performance Stats section...\n');
  
  let inPerfStats = false;
  let statsLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.toLowerCase().includes('homenights booked')) {
      inPerfStats = true;
      console.log(`Found header at line ${i}: "${line}"`);
      continue;
    }
    
    if (inPerfStats) {
      // Stop at footnotes
      if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('3 ')) {
        break;
      }
      
      if (line.length > 0) {
        statsLines.push(line);
        console.log(`Stats line: "${line}"`);
      }
    }
  }
  
  console.log('\n=== Parsing Property Stats ===\n');
  
  // Known property names from earnings section
  const knownProperties = [
    'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4',
    'Unit A', 'Unit C', 'Unit D', 'Unit G', 'Unit H',
    'Unit L1', 'Unit L2',
    'Monrovia A', 'Monrovia B',
    'Azusa E - Sunrise Getaway', 
    'Azusa F - Getaway',
    'Azusa G - Dream Getaway',
    'Azusa H - HomeAway',
    'Glendora',
    'L3 - Trailer'
  ];
  
  for (const line of statsLines) {
    console.log(`\nProcessing: "${line}"`);
    
    // Try to match against known property names
    let matched = false;
    for (const propName of knownProperties) {
      if (line.startsWith(propName)) {
        const remainder = line.substring(propName.length);
        console.log(`  Matched: "${propName}"`);
        console.log(`  Numbers: "${remainder}"`);
        
        // Parse the numbers
        if (remainder.includes('.')) {
          // Has decimal - extract nights and avg
          const parts = remainder.match(/(\d+)\.(\d+)/);
          if (parts) {
            const nightsStr = remainder.substring(0, remainder.indexOf('.'));
            const avgStr = remainder.substring(remainder.indexOf('.'));
            console.log(`  → ${nightsStr} nights, ${avgStr} avg stay`);
          }
        } else if (remainder === '00') {
          console.log(`  → No bookings`);
        } else {
          console.log(`  → ${remainder} (parse as nights?)`);
        }
        
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      console.log(`  ⚠️ Could not match to known property`);
    }
  }
}

testPropertyParsing().catch(console.error);