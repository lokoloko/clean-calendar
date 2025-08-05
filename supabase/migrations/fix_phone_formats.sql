-- Fix phone number formats for SMS compatibility
-- Run this in Supabase SQL Editor

-- Check current phone numbers
SELECT name, phone FROM public.cleaners WHERE phone IS NOT NULL;

-- Update Jane's phone: (626) 272-9875 -> 6262729875
UPDATE public.cleaners 
SET phone = '6262729875'
WHERE name = 'Jane';

-- Update Yolanda's phone: 1 (626) 547-1778‬ -> 6265471778
UPDATE public.cleaners 
SET phone = '6265471778'
WHERE name = 'Yolanda';

-- Update Richard's phone: 12134223023 -> 2134223023 (remove leading 1)
UPDATE public.cleaners 
SET phone = '2134223023'
WHERE name = 'Richard Montoya';

-- Verify all phone numbers are now 10 digits
SELECT 
    name, 
    phone,
    LENGTH(phone) as phone_length,
    CASE 
        WHEN LENGTH(phone) = 10 THEN '✓ Ready for SMS'
        ELSE '✗ Needs fixing'
    END as status
FROM public.cleaners 
WHERE phone IS NOT NULL
ORDER BY name;