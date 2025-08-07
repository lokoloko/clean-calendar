import csv
from collections import defaultdict
from datetime import datetime

# Parse transaction CSV
print('=== AIRBNB TRANSACTION CSV ANALYSIS ===\n')

properties = defaultdict(lambda: {'nights': 0, 'bookings': [], 'revenue': 0})

with open('/Users/richard/Desktop/test airbnb files/airbnb_.csv', 'r') as f:
    reader = csv.DictReader(f)
    
    for row in reader:
        if row['Type'] == 'Reservation':
            listing = row['Listing']
            nights = int(row['Nights']) if row['Nights'] else 0
            amount = float(row['Amount']) if row['Amount'] else 0
            
            if listing and nights > 0:
                properties[listing]['nights'] += nights
                properties[listing]['bookings'].append(nights)
                properties[listing]['revenue'] += amount

print('Property-Level Analysis from Transactions:')
print('-' * 70)
print(f'{"Property":<40} | {"Nights":>7} | {"Bookings":>8} | {"Avg Stay":>8}')
print('-' * 70)

total_nights = 0
for prop, data in sorted(properties.items()):
    if data['nights'] > 0:
        avg_stay = sum(data['bookings']) / len(data['bookings'])
        print(f'{prop[:40]:<40} | {data["nights"]:>7} | {len(data["bookings"]):>8} | {avg_stay:>8.1f}')
        total_nights += data['nights']

print('-' * 70)
print(f'{"TOTAL":<40} | {total_nights:>7} |')

print('\n=== KEY INSIGHTS ===')
print(f'Total nights from transaction CSV: {total_nights}')
print(f'Number of properties with bookings: {len([p for p in properties.values() if p["nights"] > 0])}')

print('\n=== COMPARISON OF DATA SOURCES ===')
print('\n1. TRANSACTION CSV (this file):')
print('   ✅ Exact nights per booking')
print('   ✅ Can calculate true average stay per property')
print('   ✅ Actual booking dates')
print('   ✅ Guest names and confirmation codes')

print('\n2. PERFORMANCE CSV (previous files):')
print('   ✅ Monthly summary metrics')
print('   ✅ Year-over-year comparisons')
print('   ✅ Average daily rates')
print('   ✅ Booking windows')

print('\n3. PDF EARNINGS REPORT:')
print('   ❌ Concatenated data (Unit133210.4)')
print('   ❌ Cannot parse individual property metrics accurately')
print('   ✅ Good for totals and tax information')

print('\n=== SOLUTION ===')
print('Use TRANSACTION CSV for accurate property-level nights and average stay!')
print('This completely solves the parsing problem!')

# Show some example calculations
print('\n=== EXAMPLE CALCULATIONS ===')
example_props = ['Unit 1', 'Unit 2', 'Unit 3', 'Monrovia Charm - Exclusive Rental Unit']
for prop_name in example_props:
    if prop_name in properties and properties[prop_name]['nights'] > 0:
        data = properties[prop_name]
        bookings = data['bookings']
        print(f'\n{prop_name}:')
        print(f'  Total nights: {data["nights"]}')
        print(f'  Number of bookings: {len(bookings)}')
        print(f'  Individual stays: {bookings[:5]}{"..." if len(bookings) > 5 else ""}')
        print(f'  Average stay: {sum(bookings)/len(bookings):.1f} nights')
        print(f'  Min stay: {min(bookings)} nights')
        print(f'  Max stay: {max(bookings)} nights')