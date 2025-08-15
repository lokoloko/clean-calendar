#!/usr/bin/env node

/**
 * Deep analysis of Airbnb CSV structure and data patterns
 */

const fs = require('fs');
const Papa = require('papaparse');

const CSV_FILE = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';

// Read and parse CSV
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

Papa.parse(csvContent, {
  header: true,
  complete: (results) => {
    const data = results.data.filter(row => row.Date); // Filter empty rows
    
    console.log('\n' + '='.repeat(80));
    console.log('AIRBNB CSV DEEP ANALYSIS');
    console.log('='.repeat(80));
    
    // 1. Basic Statistics
    console.log('\n📊 BASIC STATISTICS');
    console.log('-'.repeat(40));
    console.log(`Total rows: ${data.length}`);
    console.log(`Columns: ${Object.keys(data[0]).length}`);
    console.log(`Column names: ${Object.keys(data[0]).join(', ')}`);
    
    // 2. Transaction Types Analysis
    console.log('\n📝 TRANSACTION TYPES');
    console.log('-'.repeat(40));
    const typeCount = {};
    data.forEach(row => {
      const type = row['Type'] || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    Object.entries(typeCount).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`${type}: ${count} (${(count/data.length*100).toFixed(1)}%)`);
    });
    
    // 3. Date Range Analysis
    console.log('\n📅 DATE RANGE ANALYSIS');
    console.log('-'.repeat(40));
    const dates = data.map(row => row['Date']).filter(Boolean).map(d => new Date(d)).sort((a,b) => a - b);
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const daySpan = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const yearSpan = daySpan / 365.25;
    
    console.log(`First transaction: ${startDate.toLocaleDateString()}`);
    console.log(`Last transaction: ${endDate.toLocaleDateString()}`);
    console.log(`Total span: ${daySpan} days (${yearSpan.toFixed(1)} years)`);
    
    // 4. Confirmation Code Analysis (CRITICAL)
    console.log('\n🔑 CONFIRMATION CODE ANALYSIS (Reservations only)');
    console.log('-'.repeat(40));
    const reservations = data.filter(row => row['Type'] === 'Reservation');
    const confirmationCodes = {};
    
    reservations.forEach(row => {
      const code = row['Confirmation code'];
      if (!code) return;
      
      if (!confirmationCodes[code]) {
        confirmationCodes[code] = {
          rows: [],
          nights: new Set(),
          amounts: [],
          dates: [],
          property: row['Listing'],
          guest: row['Guest'],
          startDate: row['Start date'],
          endDate: row['End date']
        };
      }
      
      confirmationCodes[code].rows.push(row);
      confirmationCodes[code].nights.add(row['Nights']);
      confirmationCodes[code].amounts.push(parseFloat((row['Gross earnings'] || '0').replace(/[$,]/g, '')));
      confirmationCodes[code].dates.push(row['Date']);
    });
    
    // Analyze duplication patterns
    const duplicationStats = {
      unique: 0,
      duplicated: 0,
      maxDuplication: 0,
      avgDuplication: 0,
      totalNightsIfSummed: 0,
      actualUniqueNights: 0
    };
    
    let examplesShown = 0;
    Object.entries(confirmationCodes).forEach(([code, info]) => {
      const rowCount = info.rows.length;
      
      if (rowCount === 1) {
        duplicationStats.unique++;
      } else {
        duplicationStats.duplicated++;
        if (rowCount > duplicationStats.maxDuplication) {
          duplicationStats.maxDuplication = rowCount;
        }
        
        // Show first 3 examples of duplicates
        if (examplesShown < 3) {
          console.log(`\nExample: ${code} appears ${rowCount} times`);
          console.log(`  Property: ${info.property}`);
          console.log(`  Guest: ${info.guest}`);
          console.log(`  Stay: ${info.startDate} to ${info.endDate}`);
          console.log(`  Nights value(s): ${Array.from(info.nights).join(', ')}`);
          console.log(`  Total if summed: ${info.rows.reduce((sum, r) => sum + parseInt(r['Nights'] || 0), 0)} nights`);
          console.log(`  Payment dates: ${info.dates.slice(0, 5).join(', ')}${info.dates.length > 5 ? '...' : ''}`);
          console.log(`  Payment amounts: $${info.amounts.slice(0, 3).map(a => a.toFixed(2)).join(', $')}${info.amounts.length > 3 ? '...' : ''}`);
          console.log(`  Total revenue: $${info.amounts.reduce((a,b) => a+b, 0).toFixed(2)}`);
          examplesShown++;
        }
      }
      
      // Calculate total nights
      const nightsValue = parseInt(info.rows[0]['Nights'] || 0);
      duplicationStats.actualUniqueNights += nightsValue;
      duplicationStats.totalNightsIfSummed += nightsValue * rowCount;
    });
    
    duplicationStats.avgDuplication = (Object.keys(confirmationCodes).length > 0) 
      ? reservations.length / Object.keys(confirmationCodes).length 
      : 0;
    
    console.log('\n📈 DUPLICATION STATISTICS');
    console.log(`Unique confirmation codes: ${Object.keys(confirmationCodes).length}`);
    console.log(`Single-row bookings: ${duplicationStats.unique} (${(duplicationStats.unique/Object.keys(confirmationCodes).length*100).toFixed(1)}%)`);
    console.log(`Multi-row bookings: ${duplicationStats.duplicated} (${(duplicationStats.duplicated/Object.keys(confirmationCodes).length*100).toFixed(1)}%)`);
    console.log(`Max rows per booking: ${duplicationStats.maxDuplication}`);
    console.log(`Avg rows per booking: ${duplicationStats.avgDuplication.toFixed(2)}`);
    console.log(`\n⚠️  CRITICAL FINDING:`);
    console.log(`If we sum all nights: ${duplicationStats.totalNightsIfSummed.toLocaleString()} nights`);
    console.log(`Actual unique nights: ${duplicationStats.actualUniqueNights.toLocaleString()} nights`);
    console.log(`Overcounting factor: ${(duplicationStats.totalNightsIfSummed/duplicationStats.actualUniqueNights).toFixed(2)}x`);
    
    // 5. Property Analysis
    console.log('\n🏠 PROPERTY ANALYSIS');
    console.log('-'.repeat(40));
    const properties = {};
    
    Object.values(confirmationCodes).forEach(booking => {
      const prop = booking.property;
      if (!prop) return;
      
      if (!properties[prop]) {
        properties[prop] = {
          uniqueBookings: 0,
          totalRevenue: 0,
          totalNights: 0,
          firstBooking: null,
          lastBooking: null,
          bookingDates: []
        };
      }
      
      properties[prop].uniqueBookings++;
      properties[prop].totalRevenue += booking.amounts.reduce((a,b) => a+b, 0);
      properties[prop].totalNights += parseInt(booking.rows[0]['Nights'] || 0);
      
      const bookingDate = new Date(booking.rows[0]['Booking date'] || booking.rows[0]['Date']);
      properties[prop].bookingDates.push(bookingDate);
    });
    
    // Calculate property metrics
    Object.entries(properties).forEach(([name, prop]) => {
      prop.bookingDates.sort((a,b) => a - b);
      prop.firstBooking = prop.bookingDates[0];
      prop.lastBooking = prop.bookingDates[prop.bookingDates.length - 1];
      const propDaySpan = Math.ceil((prop.lastBooking - prop.firstBooking) / (1000 * 60 * 60 * 24)) || 365;
      prop.occupancy = (prop.totalNights / propDaySpan) * 100;
      prop.avgNightlyRate = prop.totalNights > 0 ? prop.totalRevenue / prop.totalNights : 0;
      prop.avgStayLength = prop.totalNights / prop.uniqueBookings;
    });
    
    console.log(`Total properties: ${Object.keys(properties).length}`);
    
    // Sort by revenue and show top properties
    const sortedProps = Object.entries(properties).sort((a,b) => b[1].totalRevenue - a[1].totalRevenue);
    console.log('\nTop 5 Properties by Revenue (CORRECT CALCULATIONS):');
    sortedProps.slice(0, 5).forEach(([name, prop]) => {
      const daySpan = Math.ceil((prop.lastBooking - prop.firstBooking) / (1000 * 60 * 60 * 24)) || 365;
      console.log(`\n📍 ${name}`);
      console.log(`  Unique bookings: ${prop.uniqueBookings}`);
      console.log(`  Total revenue: $${prop.totalRevenue.toFixed(2)}`);
      console.log(`  Total nights: ${prop.totalNights}`);
      console.log(`  Date range: ${prop.firstBooking?.toLocaleDateString()} to ${prop.lastBooking?.toLocaleDateString()} (${daySpan} days)`);
      console.log(`  TRUE Occupancy: ${prop.occupancy.toFixed(1)}%`);
      console.log(`  Avg nightly rate: $${prop.avgNightlyRate.toFixed(2)}`);
      console.log(`  Avg stay length: ${prop.avgStayLength.toFixed(1)} nights`);
    });
    
    // 6. Payout Analysis
    console.log('\n💰 PAYOUT ANALYSIS');
    console.log('-'.repeat(40));
    const payouts = data.filter(row => row['Type'] === 'Payout');
    const coHostPayouts = data.filter(row => row['Type'] === 'Co-Host payout');
    
    console.log(`Regular payouts: ${payouts.length}`);
    console.log(`Co-Host payouts: ${coHostPayouts.length}`);
    
    // 7. Data Quality Issues
    console.log('\n⚠️  DATA QUALITY ISSUES');
    console.log('-'.repeat(40));
    
    // Check for missing confirmation codes
    const reservationsNoCode = reservations.filter(r => !r['Confirmation code']);
    console.log(`Reservations without confirmation code: ${reservationsNoCode.length}`);
    
    // Check for missing nights
    const reservationsNoNights = reservations.filter(r => !r['Nights'] || r['Nights'] === '0');
    console.log(`Reservations without nights: ${reservationsNoNights.length}`);
    
    // Check for missing amounts
    const reservationsNoAmount = reservations.filter(r => !r['Gross earnings'] || r['Gross earnings'] === '0');
    console.log(`Reservations without gross earnings: ${reservationsNoAmount.length}`);
    
    // 8. Summary and Recommendations
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY & KEY FINDINGS');
    console.log('='.repeat(80));
    console.log('\n1. CRITICAL: Long-term bookings create multiple rows (monthly payments)');
    console.log('2. Each row duplicates the total nights value, causing massive overcounting');
    console.log('3. Revenue should be summed across duplicate confirmation codes');
    console.log('4. Nights should be taken ONCE per confirmation code');
    console.log('5. Date range spans ~8 years, not 1 year');
    console.log('6. Occupancy must be calculated against actual property date ranges');
    console.log('\nREQUIRED FIXES:');
    console.log('✓ Group by confirmation code before processing');
    console.log('✓ Take nights value once per booking');
    console.log('✓ Sum revenue across all payment rows');
    console.log('✓ Calculate occupancy using actual date spans per property');
    console.log('✓ Handle properties with different active periods correctly');
  }
});