#!/usr/bin/env node

/**
 * Test the actual data flow through the app's CSV parser
 */

const fs = require('fs');

// Import the actual CSV parser class
const { TransactionCSVParser } = require('./dist/lib/parsers/csv-parser.js');

async function testAppDataFlow() {
  const csvPath = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';
  const csvContent = fs.readFileSync(csvPath);
  
  // Create a File-like object
  const file = {
    text: async () => csvContent.toString(),
    name: 'airbnb_.csv',
    type: 'text/csv'
  };
  
  const parser = new TransactionCSVParser();
  
  try {
    const result = await parser.parse(file);
    
    console.log('\n=== CSV PARSER OUTPUT ===');
    console.log('Total Revenue:', result.totalRevenue.toFixed(2));
    console.log('Properties Found:', result.propertyNames.length);
    console.log('Date Range:', result.dateRange.start, 'to', result.dateRange.end);
    
    console.log('\n=== PROPERTY METRICS (First 5) ===');
    result.propertyMetrics.slice(0, 5).forEach((prop, idx) => {
      console.log(`\n${idx + 1}. ${prop.name}`);
      console.log(`   Revenue: $${prop.totalRevenue.toFixed(2)}`);
      console.log(`   Nights: ${prop.totalNights}`);
      console.log(`   Bookings: ${prop.bookingCount}`);
      console.log(`   Avg Stay: ${prop.avgStayLength.toFixed(1)} nights`);
      console.log(`   Avg Rate: $${prop.avgNightlyRate.toFixed(2)}/night`);
      
      // Calculate occupancy based on date range
      if (prop.dateRange) {
        const start = new Date(prop.dateRange.start);
        const end = new Date(prop.dateRange.end);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const occupancy = (prop.totalNights / days) * 100;
        console.log(`   Date Range: ${days} days`);
        console.log(`   Occupancy: ${occupancy.toFixed(1)}%`);
      }
    });
    
    console.log('\n=== WHAT THE APP WOULD SHOW ===');
    console.log('Properties Page:');
    result.propertyMetrics.slice(0, 3).forEach(prop => {
      console.log(`  ${prop.name}: $${prop.totalRevenue.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAppDataFlow();