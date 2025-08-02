-- Set richmontoya@gmail.com user to pro tier
UPDATE profiles 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  updated_at = NOW()
WHERE email = 'richmontoya@gmail.com';

-- Verify the update
SELECT id, email, subscription_tier, subscription_status 
FROM profiles 
WHERE email = 'richmontoya@gmail.com';