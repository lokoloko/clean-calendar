-- One-time script to upgrade richmontoya@gmail.com to Pro tier
-- Run this in Supabase SQL Editor (production)

-- First, let's check the current status
SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  created_at
FROM profiles 
WHERE email = 'richmontoya@gmail.com';

-- Update the user to Pro tier
UPDATE profiles 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  trial_ends_at = NULL, -- Remove trial if any
  updated_at = NOW()
WHERE email = 'richmontoya@gmail.com';

-- Verify the update was successful
SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  updated_at
FROM profiles 
WHERE email = 'richmontoya@gmail.com';

-- Show the new limits
SELECT 
  'Pro tier activated! You now have:' as message,
  999 as max_listings,
  999 as max_cleaners,
  true as sms_enabled,
  true as whatsapp_enabled,
  true as cleaner_dashboard,
  true as auto_assignment,
  true as analytics;