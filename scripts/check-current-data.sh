#!/bin/bash

# Script to check current data before auth migration

echo "Clean Calendar - Current Data Summary"
echo "===================================="
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

psql $DATABASE_URL << 'EOF'
-- Show current data summary
SELECT 
    'Current User ID' as info, 
    '00000000-0000-0000-0000-000000000001' as value
UNION ALL
SELECT 
    'Total Listings', 
    COUNT(*)::text 
FROM public.listings 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    'Total Cleaners', 
    COUNT(*)::text 
FROM public.cleaners c
JOIN public.cleaner_assignments ca ON c.id = ca.cleaner_id
JOIN public.listings l ON ca.listing_id = l.id
WHERE l.user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    'Total Schedule Items', 
    COUNT(*)::text 
FROM public.schedule_items s
JOIN public.listings l ON s.listing_id = l.id
WHERE l.user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    'Pending Cleanings', 
    COUNT(*)::text 
FROM public.schedule_items s
JOIN public.listings l ON s.listing_id = l.id
WHERE l.user_id = '00000000-0000-0000-0000-000000000001'
AND s.status = 'pending'
UNION ALL
SELECT 
    'Completed Cleanings', 
    COUNT(*)::text 
FROM public.schedule_items s
JOIN public.listings l ON s.listing_id = l.id
WHERE l.user_id = '00000000-0000-0000-0000-000000000001'
AND s.status = 'completed';

-- Show listings
echo ''
echo 'Your Listings:'
echo '--------------'
SELECT 
    name, 
    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status,
    CASE WHEN ics_url IS NOT NULL THEN 'Synced' ELSE 'Not Synced' END as sync_status
FROM public.listings 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY name;

-- Show cleaners
echo ''
echo 'Your Cleaners:'
echo '--------------'
SELECT DISTINCT
    c.name,
    c.email,
    c.phone,
    COUNT(ca.listing_id) as assigned_properties
FROM public.cleaners c
JOIN public.cleaner_assignments ca ON c.id = ca.cleaner_id
JOIN public.listings l ON ca.listing_id = l.id
WHERE l.user_id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id, c.name, c.email, c.phone
ORDER BY c.name;
EOF