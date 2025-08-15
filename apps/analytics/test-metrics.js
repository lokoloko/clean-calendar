#!/usr/bin/env node

/**
 * Test metrics calculation for analytics app
 */

const fs = require('fs');
const Papa = require('papaparse');

const CSV_FILE = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';

// Read and parse CSV
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

Papa.parse(csvContent, {
  header: true,
  complete: (results) => {
    const transactions = results.data;
    
    // Filter for reservations only
    const reservations = transactions.filter(t => t['Type'] === 'Reservation');
    
    // Group by property
    const propertyMetrics = {};
    
    reservations.forEach(row => {
      const listing = row['Listing'] || 'Unknown';
      const nights = parseInt(row['Nights']) || 0;
      const grossEarnings = parseFloat((row['Gross earnings'] || '0').replace(/[$,]/g, ''));
      
      if (!propertyMetrics[listing]) {
        propertyMetrics[listing] = {
          name: listing,
          totalNights: 0,
          totalRevenue: 0,
          bookingCount: 0,
          stayLengths: []
        };
      }
      
      propertyMetrics[listing].totalNights += nights;
      propertyMetrics[listing].totalRevenue += grossEarnings;
      propertyMetrics[listing].bookingCount += 1;
      if (nights > 0) {
        propertyMetrics[listing].stayLengths.push(nights);
      }
    });
    
    // Calculate final metrics
    console.log('\n=== PROPERTY METRICS FROM CSV ===\n');
    
    Object.values(propertyMetrics).forEach(prop => {
      const avgStayLength = prop.stayLengths.length > 0 
        ? prop.stayLengths.reduce((a, b) => a + b, 0) / prop.stayLengths.length 
        : 0;
      const avgNightlyRate = prop.totalNights > 0 
        ? prop.totalRevenue / prop.totalNights 
        : 0;
      const occupancyRate = (prop.totalNights / 365) * 100;
      
      console.log(`📍 ${prop.name}`);
      console.log(`   Total Revenue: $${prop.totalRevenue.toFixed(2)}`);
      console.log(`   Total Nights: ${prop.totalNights}`);
      console.log(`   Bookings: ${prop.bookingCount}`);
      console.log(`   Avg Stay: ${avgStayLength.toFixed(1)} nights`);
      console.log(`   Avg Rate: $${avgNightlyRate.toFixed(2)}/night`);
      console.log(`   Occupancy: ${occupancyRate.toFixed(1)}%`);
      console.log('');
    });
    
    // Calculate totals
    const totals = Object.values(propertyMetrics).reduce((acc, prop) => ({
      revenue: acc.revenue + prop.totalRevenue,
      nights: acc.nights + prop.totalNights,
      bookings: acc.bookings + prop.bookingCount
    }), { revenue: 0, nights: 0, bookings: 0 });
    
    console.log('=== PORTFOLIO TOTALS ===');
    console.log(`Total Revenue: $${totals.revenue.toFixed(2)}`);
    console.log(`Total Nights: ${totals.nights}`);
    console.log(`Total Bookings: ${totals.bookings}`);
    console.log(`Portfolio Occupancy: ${(totals.nights / (365 * Object.keys(propertyMetrics).length) * 100).toFixed(1)}%`);
    console.log(`Avg Rate: $${(totals.revenue / totals.nights).toFixed(2)}/night`);
  }
});