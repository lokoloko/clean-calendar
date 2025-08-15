#!/usr/bin/env node

const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('/Users/richard/Desktop/test airbnb files/airbnb_.csv', 'utf-8');

Papa.parse(csv, {
  header: true,
  complete: (r) => {
    const res = r.data.filter(row => row.Date && row['Type'] === 'Reservation');
    
    console.log('=== BOOKING DATES VS STAY DATES ANALYSIS ===\n');
    
    // Group by property to analyze date ranges
    const properties = {};
    
    res.forEach(row => {
      const prop = row['Listing'];
      if (!prop) return;
      
      if (!properties[prop]) {
        properties[prop] = {
          bookingDates: [],
          stayStartDates: [],
          stayEndDates: [],
          transactionDates: [],
          nights: 0,
          bookings: new Set()
        };
      }
      
      if (row['Booking date']) properties[prop].bookingDates.push(row['Booking date']);
      if (row['Start date']) properties[prop].stayStartDates.push(row['Start date']);
      if (row['End date']) properties[prop].stayEndDates.push(row['End date']);
      if (row['Date']) properties[prop].transactionDates.push(row['Date']);
      if (row['Confirmation code']) {
        properties[prop].bookings.add(row['Confirmation code']);
        if (!properties[prop].bookings.has(row['Confirmation code'] + '_counted')) {
          properties[prop].nights += parseInt(row['Nights'] || 0);
          properties[prop].bookings.add(row['Confirmation code'] + '_counted');
        }
      }
    });
    
    // Analyze a specific property
    const testProp = 'Tranquil Apartment Steps from Old Town Monrovia';
    const propData = properties[testProp];
    
    if (propData) {
      // Sort dates
      propData.bookingDates.sort();
      propData.stayStartDates.sort();
      propData.stayEndDates.sort();
      propData.transactionDates.sort();
      
      console.log('Property:', testProp);
      console.log('\n📅 BOOKING DATE RANGE (when guests made reservations):');
      console.log('  First booking made:', propData.bookingDates[0]);
      console.log('  Last booking made:', propData.bookingDates[propData.bookingDates.length - 1]);
      
      const bookingSpan = Math.ceil((new Date(propData.bookingDates[propData.bookingDates.length - 1]) - new Date(propData.bookingDates[0])) / (1000 * 60 * 60 * 24));
      console.log('  Booking span:', bookingSpan, 'days');
      
      console.log('\n🏨 STAY DATE RANGE (actual property occupancy):');
      console.log('  First check-in:', propData.stayStartDates[0]);
      console.log('  Last check-out:', propData.stayEndDates[propData.stayEndDates.length - 1]);
      
      const staySpan = Math.ceil((new Date(propData.stayEndDates[propData.stayEndDates.length - 1]) - new Date(propData.stayStartDates[0])) / (1000 * 60 * 60 * 24));
      console.log('  Stay span:', staySpan, 'days');
      
      console.log('\n💰 TRANSACTION DATE RANGE (payment dates):');
      console.log('  First transaction:', propData.transactionDates[0]);
      console.log('  Last transaction:', propData.transactionDates[propData.transactionDates.length - 1]);
      
      const transSpan = Math.ceil((new Date(propData.transactionDates[propData.transactionDates.length - 1]) - new Date(propData.transactionDates[0])) / (1000 * 60 * 60 * 24));
      console.log('  Transaction span:', transSpan, 'days');
      
      console.log('\n⚠️  KEY INSIGHT:');
      console.log('  - Booking dates: When reservations were MADE (not relevant for occupancy)');
      console.log('  - Stay dates: When guests actually STAYED (THIS is what matters for occupancy!)');
      console.log('  - Transaction dates: When payments were processed');
      
      // Calculate occupancy with different approaches
      const nights = propData.nights;
      console.log('\n📊 OCCUPANCY CALCULATIONS (' + nights + ' nights):');
      console.log('  ❌ Using booking span:', (nights / bookingSpan * 100).toFixed(1) + '% (WRONG - this is when bookings were made)');
      console.log('  ✅ Using stay span:', (nights / staySpan * 100).toFixed(1) + '% (CORRECT - actual occupancy period)');
      console.log('  ❌ Using transaction span:', (nights / transSpan * 100).toFixed(1) + '% (WRONG - payment dates)');
    }
    
    // Check what our parser might be doing wrong
    console.log('\n=== WHAT MIGHT BE HAPPENING IN THE CODE ===');
    console.log('The parser might be incorrectly using:');
    console.log('1. Booking dates (when reservation was made) instead of stay dates');
    console.log('2. Transaction dates (payment dates) instead of stay dates');
    console.log('3. Mixed up start/end dates');
    
    // Show correct calculation for all properties
    console.log('\n=== CORRECT OCCUPANCY FOR TOP 3 PROPERTIES ===');
    const propList = Object.entries(properties)
      .map(([name, data]) => ({
        name,
        nights: data.nights,
        stayStart: data.stayStartDates[0],
        stayEnd: data.stayEndDates[data.stayEndDates.length - 1]
      }))
      .filter(p => p.stayStart && p.stayEnd)
      .sort((a, b) => b.nights - a.nights)
      .slice(0, 3);
    
    propList.forEach(prop => {
      const span = Math.ceil((new Date(prop.stayEnd) - new Date(prop.stayStart)) / (1000 * 60 * 60 * 24));
      const occupancy = (prop.nights / span * 100).toFixed(1);
      
      console.log('\n' + prop.name);
      console.log('  Stay period:', prop.stayStart, 'to', prop.stayEnd);
      console.log('  Days in period:', span);
      console.log('  Nights booked:', prop.nights);
      console.log('  ✅ Correct occupancy:', occupancy + '%');
    });
  }
});