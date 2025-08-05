-- Normalize existing phone numbers to 10-digit format
-- This will help ensure SMS sending works properly

-- First, let's see the current phone numbers
SELECT id, name, phone, LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) as digit_count
FROM public.cleaners
WHERE phone IS NOT NULL;

-- Update phone numbers to normalized 10-digit format
UPDATE public.cleaners
SET phone = CASE
    -- Remove all non-numeric characters and leading 1 if present
    WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 11 
         AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '1%' THEN
        SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g') FROM 2)
    ELSE
        REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    END
WHERE phone IS NOT NULL;

-- Verify the updates
SELECT id, name, phone, LENGTH(phone) as phone_length
FROM public.cleaners
WHERE phone IS NOT NULL
ORDER BY name;