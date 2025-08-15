#!/usr/bin/env node

const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('/Users/richard/Desktop/test airbnb files/airbnb_.csv', 'utf-8');

Papa.parse(csv, {
  header: true,
  complete: (r) => {
    const res = r.data.filter(row => row.Date && row['Type'] === 'Reservation');
    
    // Get all stay dates as Date objects
    const allStayStarts = [];
    const allStayEnds = [];
    
    res.forEach(row => {
      if (row['Start date']) allStayStarts.push(new Date(row['Start date']));
      if (row['End date']) allStayEnds.push(new Date(row['End date']));
    });
    
    // Sort properly as dates
    allStayStarts.sort((a, b) => a - b);
    allStayEnds.sort((a, b) => a - b);
    
    console.log('=== ACTUAL DATE RANGES IN CSV ===');
    console.log('\nEarliest check-in:', allStayStarts[0].toLocaleDateString());
    console.log('Latest check-out:', allStayEnds[allStayEnds.length - 1].toLocaleDateString());
    
    const totalSpan = Math.ceil((allStayEnds[allStayEnds.length - 1] - allStayStarts[0]) / (1000 * 60 * 60 * 24));
    console.log('Total span:', totalSpan, 'days (', (totalSpan/365.25).toFixed(1), 'years)');
    
    // Group by property and calculate correct occupancy
    const properties = {};
    
    res.forEach(row => {
      const prop = row['Listing'];
      if (!prop) return;
      
      if (!properties[prop]) {
        properties[prop] = {
          stays: new Set(),
          nights: 0,
          firstStay: null,
          lastStay: null
        };
      }
      
      const code = row['Confirmation code'];
      if (code && !properties[prop].stays.has(code)) {
        properties[prop].stays.add(code);
        properties[prop].nights += parseInt(row['Nights'] || 0);
        
        const start = row['Start date'] ? new Date(row['Start date']) : null;
        const end = row['End date'] ? new Date(row['End date']) : null;
        
        if (start && (!properties[prop].firstStay || start < properties[prop].firstStay)) {
          properties[prop].firstStay = start;
        }
        if (end && (!properties[prop].lastStay || end > properties[prop].lastStay)) {
          properties[prop].lastStay = end;
        }
      }
    });
    
    console.log('\n=== CORRECT OCCUPANCY CALCULATIONS ===');
    const propList = Object.entries(properties)
      .filter(([name, data]) => data.firstStay && data.lastStay)
      .map(([name, data]) => {
        const span = Math.ceil((data.lastStay - data.firstStay) / (1000 * 60 * 60 * 24));
        return {
          name,
          nights: data.nights,
          span,
          occupancy: (data.nights / span * 100).toFixed(1),
          firstStay: data.firstStay.toLocaleDateString(),
          lastStay: data.lastStay.toLocaleDateString(),
          revenue: 0 // Will be calculated separately
        };
      })
      .sort((a, b) => b.nights - a.nights)
      .slice(0, 5);
    
    propList.forEach((prop, idx) => {
      console.log('\n' + (idx + 1) + '. ' + prop.name);
      console.log('   Period: ' + prop.firstStay + ' to ' + prop.lastStay);
      console.log('   Span: ' + prop.span + ' days (' + (prop.span/365.25).toFixed(1) + ' years)');
      console.log('   Nights: ' + prop.nights);
      console.log('   ✅ Occupancy: ' + prop.occupancy + '%');
    });
    
    console.log('\n🎯 KEY FINDINGS:');
    console.log('1. The CSV parser is using STRING SORTING instead of DATE SORTING');
    console.log('2. This causes "01/01/2022" to sort before "12/31/2021" alphabetically');
    console.log('3. Result: End dates appear before start dates, causing negative day spans');
    console.log('4. Solution: Parse dates to Date objects before sorting');
    
    console.log('\n📊 WHAT THE APP SHOULD SHOW:');
    console.log('Properties page should display each property with:');
    console.log('- Its individual revenue (not the portfolio total)');
    console.log('- Realistic occupancy rates (40-90% range)');
    console.log('- Accurate booking counts and average rates');
  }
});