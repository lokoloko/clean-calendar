-- Check for L3 - RV booking in schedule_items
SELECT 
    id,
    listing_id,
    guest_name,
    check_in,
    check_out,
    status,
    cancelled_at,
    notes,
    booking_uid,
    created_at,
    updated_at
FROM schedule_items
WHERE guest_name LIKE '%RV%' 
   OR notes LIKE '%L3%'
   OR notes LIKE '%RV%'
ORDER BY check_out DESC
LIMIT 10;

-- Also check by listing if L3 is a listing name
SELECT 
    si.id,
    l.name as listing_name,
    si.guest_name,
    si.check_in,
    si.check_out,
    si.status,
    si.cancelled_at,
    si.notes,
    si.booking_uid
FROM schedule_items si
JOIN listings l ON l.id = si.listing_id
WHERE l.name LIKE '%L3%'
ORDER BY si.check_out DESC
LIMIT 10;