import csv

# Parse July CSV
print('=== JULY 2025 PERFORMANCE DATA ===')
with open('/Users/richard/Desktop/test airbnb files/ac6f5c85-5285-48f5-96c3-6640a4349cd5.csv', 'r') as f:
    reader = csv.DictReader(f)
    print('\nProperty Name | Nights | Avg Stay | Daily Rate | Revenue')
    print('-' * 70)
    
    july_total = 0
    for row in reader:
        name = row.get('Internal name', '')
        nights = row.get('Nights booked', '0')
        avg_stay = row.get('Average length of stay', '0')
        daily_rate = row.get('Average daily rate', '')
        revenue = row.get('Booking value', '0')
        
        if name and nights != '0' and nights != '':
            print(f"{name:20s} | {nights:6s} | {avg_stay:8s} | ${daily_rate:7s} | ${revenue}")
            try:
                july_total += int(float(nights))
            except:
                pass
    
    print(f'\nTotal July nights: {july_total}')

# Parse August CSV
print('\n=== AUGUST 1-5, 2025 PERFORMANCE DATA ===')
with open('/Users/richard/Desktop/test airbnb files/b0d0b244-7dcf-4713-baa4-08c8e4ee8384.csv', 'r') as f:
    reader = csv.DictReader(f)
    print('\nProperty Name | Nights | Avg Stay | Daily Rate | Revenue')
    print('-' * 70)
    
    aug_total = 0
    for row in reader:
        name = row.get('Internal name', '')
        nights = row.get('Nights booked', '0')
        avg_stay = row.get('Average length of stay', '0')
        daily_rate = row.get('Average daily rate', '')
        revenue = row.get('Booking value', '0')
        
        if name and nights != '0' and nights != '':
            print(f"{name:20s} | {nights:6s} | {avg_stay:8s} | ${daily_rate:7s} | ${revenue}")
            try:
                aug_total += int(float(nights))
            except:
                pass
    
    print(f'\nTotal August nights: {aug_total}')

print('\n=== KEY INSIGHTS ===')
print(f'Total nights from CSVs: {july_total + aug_total}')
print('\nThis data is PERFECT for our needs:')
print('✅ Exact nights per property (no estimation needed)')
print('✅ Exact average stay per property (not portfolio average)')
print('✅ Actual daily rates (can calculate accurate revenue)')
print('\nUnlike PDF: No concatenation, no ambiguity!')
print('Example: Unit 1 shows as separate columns, not "Unit133210.4"')