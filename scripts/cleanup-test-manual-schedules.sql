-- Script to clean up test manual schedule entries
-- Run this in Supabase SQL Editor (production)

-- First, let's see what we're about to delete
SELECT 
  msr.id,
  l.name as listing_name,
  c.name as cleaner_name,
  msr.frequency,
  msr.is_active,
  msr.created_at
FROM manual_schedule_rules msr
JOIN listings l ON msr.listing_id = l.id
JOIN cleaners c ON msr.cleaner_id = c.id
WHERE l.name = 'Azusa E - Sunrise Getaway'
  AND msr.is_active = false
ORDER BY msr.created_at DESC;

-- Count of inactive test schedules
SELECT COUNT(*) as inactive_test_schedules
FROM manual_schedule_rules msr
JOIN listings l ON msr.listing_id = l.id
WHERE l.name = 'Azusa E - Sunrise Getaway'
  AND msr.is_active = false;

-- DELETE inactive test schedules for Azusa E - Sunrise Getaway
-- Uncomment the lines below to actually delete them

-- DELETE FROM manual_schedule_rules
-- WHERE id IN (
--   SELECT msr.id
--   FROM manual_schedule_rules msr
--   JOIN listings l ON msr.listing_id = l.id
--   WHERE l.name = 'Azusa E - Sunrise Getaway'
--     AND msr.is_active = false
-- );

-- Alternative: Delete ALL test schedules for Azusa E - Sunrise Getaway (including active ones)
-- Use with caution!

-- DELETE FROM manual_schedule_rules
-- WHERE id IN (
--   SELECT msr.id
--   FROM manual_schedule_rules msr
--   JOIN listings l ON msr.listing_id = l.id
--   WHERE l.name = 'Azusa E - Sunrise Getaway'
-- );

-- After deletion, verify remaining schedules
SELECT 
  msr.id,
  l.name as listing_name,
  c.name as cleaner_name,
  msr.frequency,
  msr.schedule_type,
  msr.is_active,
  msr.created_at
FROM manual_schedule_rules msr
JOIN listings l ON msr.listing_id = l.id
JOIN cleaners c ON msr.cleaner_id = c.id
ORDER BY l.name, msr.created_at DESC;