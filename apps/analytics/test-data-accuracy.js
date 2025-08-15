#!/usr/bin/env node

/**
 * Test data accuracy through the parsing pipeline
 */

const fs = require('fs');
const Papa = require('papaparse');

const CSV_FILE = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';

// Read and parse CSV
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

Papa.parse(csvContent, {
  header: true,
  complete: (results) => {
    const transactions = results.data.filter(row => row.Date);
    
    // === STEP 1: Group by confirmation code (like the fixed parser) ===
    const groupedReservations = new Map();
    const reservations = transactions.filter(t => t['Type'] === 'Reservation');
    
    for (const transaction of reservations) {
      const code = transaction['Confirmation code'];
      
      if (!code) {
        // Treat as unique transaction
        const uniqueKey = `no-code-${Math.random()}`;
        groupedReservations.set(uniqueKey, {
          listing: transaction['Listing'],
          nights: parseInt(transaction['Nights'] || 0),
          totalRevenue: parseFloat((transaction['Gross earnings'] || '0').replace(/[$,]/g, '')),
          startDate: transaction['Start date'],
          endDate: transaction['End date']
        });
        continue;
      }
      
      if (!groupedReservations.has(code)) {
        // First occurrence - initialize
        groupedReservations.set(code, {
          listing: transaction['Listing'],
          nights: parseInt(transaction['Nights'] || 0), // Take nights ONCE
          totalRevenue: 0,
          startDate: transaction['Start date'],
          endDate: transaction['End date']
        });
      }
      
      // Add revenue from this row
      const booking = groupedReservations.get(code);
      booking.totalRevenue += parseFloat((transaction['Gross earnings'] || '0').replace(/[$,]/g, ''));
    }
    
    // === STEP 2: Calculate property metrics from grouped data ===
    const propertyMap = new Map();
    
    for (const booking of groupedReservations.values()) {
      const propertyName = booking.listing;
      if (!propertyName) continue;
      
      if (!propertyMap.has(propertyName)) {
        propertyMap.set(propertyName, {
          name: propertyName,
          totalNights: 0,
          bookingCount: 0,
          totalRevenue: 0,
          firstDate: booking.startDate,
          lastDate: booking.endDate
        });
      }
      
      const metrics = propertyMap.get(propertyName);
      metrics.totalNights += booking.nights;
      metrics.bookingCount += 1;
      metrics.totalRevenue += booking.totalRevenue;
      
      // Update date range
      if (booking.startDate && booking.startDate < metrics.firstDate) {
        metrics.firstDate = booking.startDate;
      }
      if (booking.endDate && booking.endDate > metrics.lastDate) {
        metrics.lastDate = booking.endDate;
      }
    }
    
    // === STEP 3: Calculate final metrics ===
    const properties = Array.from(propertyMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    console.log('\n' + '='.repeat(80));
    console.log('DATA ACCURACY ANALYSIS - SIMULATING APP FLOW');
    console.log('='.repeat(80));
    
    console.log('\n📊 OVERVIEW');
    console.log('Total unique bookings:', groupedReservations.size);
    console.log('Total properties:', properties.length);
    console.log('Total revenue: $' + properties.reduce((sum, p) => sum + p.totalRevenue, 0).toFixed(2));
    
    console.log('\n🏠 TOP 5 PROPERTIES - WHAT APP SHOULD DISPLAY');
    properties.slice(0, 5).forEach((prop, idx) => {
      const daySpan = prop.firstDate && prop.lastDate 
        ? Math.ceil((new Date(prop.lastDate) - new Date(prop.firstDate)) / (1000 * 60 * 60 * 24))
        : 365;
      const occupancy = (prop.totalNights / daySpan) * 100;
      const avgRate = prop.totalNights > 0 ? prop.totalRevenue / prop.totalNights : 0;
      const avgStay = prop.bookingCount > 0 ? prop.totalNights / prop.bookingCount : 0;
      
      console.log(`\n${idx + 1}. ${prop.name}`);
      console.log(`   💰 Revenue: $${prop.totalRevenue.toFixed(2)}`);
      console.log(`   🛏️ Nights: ${prop.totalNights}`);
      console.log(`   📅 Bookings: ${prop.bookingCount}`);
      console.log(`   💵 Avg Rate: $${avgRate.toFixed(2)}/night`);
      console.log(`   🏖️ Avg Stay: ${avgStay.toFixed(1)} nights`);
      console.log(`   📊 Occupancy: ${occupancy.toFixed(1)}% (${prop.totalNights}/${daySpan} days)`);
    });
    
    console.log('\n✅ PROPERTIES PAGE SHOULD SHOW:');
    properties.slice(0, 5).forEach(prop => {
      console.log(`   ${prop.name}: $${prop.totalRevenue.toFixed(2)}`);
    });
    
    console.log('\n⚠️ DATA QUALITY CHECKS:');
    const overOccupied = properties.filter(p => {
      const days = p.firstDate && p.lastDate 
        ? Math.ceil((new Date(p.lastDate) - new Date(p.firstDate)) / (1000 * 60 * 60 * 24))
        : 365;
      return (p.totalNights / days) > 1;
    });
    
    if (overOccupied.length > 0) {
      console.log(`   ❌ ${overOccupied.length} properties show >100% occupancy (data issue)`);
    } else {
      console.log('   ✅ All properties show realistic occupancy (<100%)');
    }
    
    // Check for duplicate counting
    const rawNights = reservations.reduce((sum, r) => sum + parseInt(r['Nights'] || 0), 0);
    const dedupedNights = Array.from(groupedReservations.values()).reduce((sum, b) => sum + b.nights, 0);
    const overcountFactor = rawNights / dedupedNights;
    
    console.log(`   📈 Overcount factor: ${overcountFactor.toFixed(2)}x (${rawNights} raw vs ${dedupedNights} actual)`);
    if (overcountFactor > 1.5) {
      console.log('   ❌ Significant duplicate counting detected - deduplication working correctly');
    } else {
      console.log('   ✅ Minimal duplicate counting');
    }
  }
});