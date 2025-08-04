-- Normalize existing phone numbers to 10-digit format
-- This migration cleans up phone numbers by removing formatting and country codes

-- Create a function to normalize phone numbers
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Return NULL if input is NULL or empty
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN phone_input;
  END IF;
  
  -- Remove all non-numeric characters
  cleaned := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Remove leading 1 if it's 11 digits (North American country code)
  IF length(cleaned) = 11 AND substring(cleaned, 1, 1) = '1' THEN
    cleaned := substring(cleaned, 2);
  END IF;
  
  -- Only return if it's a valid 10-digit number
  IF length(cleaned) = 10 AND substring(cleaned, 1, 1) NOT IN ('0', '1') THEN
    RETURN cleaned;
  ELSE
    -- Return original if we can't normalize it
    RETURN phone_input;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing cleaner phone numbers
UPDATE public.cleaners 
SET phone = normalize_phone_number(phone)
WHERE phone IS NOT NULL;

-- Clean up the function
DROP FUNCTION normalize_phone_number(TEXT);