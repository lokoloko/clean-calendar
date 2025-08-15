#!/usr/bin/env node

// Test the fixed date sorting logic

const dates = [
  { startDate: '01/01/2022', endDate: '01/10/2022' },
  { startDate: '12/20/2021', endDate: '12/31/2021' },
  { startDate: '08/01/2025', endDate: '08/15/2025' }
];

console.log('=== Testing Date Sorting Fix ===\n');

// OLD WAY (String sorting - WRONG)
console.log('❌ OLD: String sorting');
const oldStart = dates.map(d => d.startDate).sort()[0];
const oldEnd = dates.map(d => d.endDate).sort()[dates.length - 1];
console.log('  First start:', oldStart);
console.log('  Last end:', oldEnd);
const oldSpan = Math.ceil((new Date(oldEnd) - new Date(oldStart)) / (1000 * 60 * 60 * 24));
console.log('  Span:', oldSpan, 'days\n');

// NEW WAY (Date object sorting - CORRECT)
console.log('✅ NEW: Date object sorting');
const startDates = dates.map(d => new Date(d.startDate)).sort((a, b) => a - b);
const endDates = dates.map(d => new Date(d.endDate)).sort((a, b) => a - b);
const newStart = startDates[0].toLocaleDateString();
const newEnd = endDates[endDates.length - 1].toLocaleDateString();
console.log('  First start:', newStart);
console.log('  Last end:', newEnd);
const newSpan = Math.ceil((endDates[endDates.length - 1] - startDates[0]) / (1000 * 60 * 60 * 24));
console.log('  Span:', newSpan, 'days\n');

// Simulate property metrics calculation
console.log('=== Property Metrics with Fixed Logic ===\n');

const testProperty = {
  bookings: [
    { nights: 10, revenue: 1000, startDate: '12/20/2021', endDate: '12/30/2021' },
    { nights: 5, revenue: 500, startDate: '01/01/2022', endDate: '01/06/2022' },
    { nights: 20, revenue: 2000, startDate: '08/01/2025', endDate: '08/21/2025' }
  ]
};

// Calculate with proper date comparison
let firstStart = null;
let lastEnd = null;
let totalNights = 0;
let totalRevenue = 0;

testProperty.bookings.forEach(booking => {
  totalNights += booking.nights;
  totalRevenue += booking.revenue;
  
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  
  if (!firstStart || start < firstStart) {
    firstStart = start;
  }
  if (!lastEnd || end > lastEnd) {
    lastEnd = end;
  }
});

const propertySpan = Math.ceil((lastEnd - firstStart) / (1000 * 60 * 60 * 24));
const occupancy = (totalNights / propertySpan * 100).toFixed(1);

console.log('Property Analysis:');
console.log('  Period:', firstStart.toLocaleDateString(), 'to', lastEnd.toLocaleDateString());
console.log('  Span:', propertySpan, 'days');
console.log('  Total nights:', totalNights);
console.log('  Total revenue: $' + totalRevenue);
console.log('  Occupancy:', occupancy + '%');
console.log('  Avg rate: $' + (totalRevenue / totalNights).toFixed(2) + '/night');

console.log('\n✅ With proper date sorting, we get realistic occupancy rates!');