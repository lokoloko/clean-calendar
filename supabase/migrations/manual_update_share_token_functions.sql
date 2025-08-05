-- Update share token functions to include source and manual_rule_frequency fields
-- Run this in Supabase SQL editor to update the cleaner share link functions

-- First drop the existing function
DROP FUNCTION IF EXISTS get_cleaner_schedule_by_token(TEXT);

-- Create updated function with additional fields
CREATE OR REPLACE FUNCTION get_cleaner_schedule_by_token(share_token TEXT)
RETURNS TABLE (
  id UUID,
  listing_id UUID,
  listing_name TEXT,
  host_email TEXT,
  cleaner_id UUID,
  cleaner_name TEXT,
  check_in DATE,
  check_out DATE,
  checkout_time TIME,
  guest_name TEXT,
  is_completed BOOLEAN,
  feedback_id UUID,
  cleanliness_rating TEXT,
  feedback_notes TEXT,
  feedback_completed_at TIMESTAMP WITH TIME ZONE,
  booking_uid TEXT,
  status TEXT,
  source TEXT,
  manual_rule_frequency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaner_id UUID;
BEGIN
  -- First verify the token and get the cleaner_id
  SELECT cs.cleaner_id INTO v_cleaner_id
  FROM cleaner_sessions cs
  WHERE cs.token = share_token
  AND cs.expires_at > NOW()
  LIMIT 1;
  
  -- If no valid token found, return empty result
  IF v_cleaner_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the schedule for this cleaner
  RETURN QUERY
  SELECT 
    si.id,
    si.listing_id,
    l.name AS listing_name,
    p.email AS host_email,
    si.cleaner_id,
    c.name AS cleaner_name,
    si.check_in,
    si.check_out,
    si.checkout_time,
    si.guest_name,
    COALESCE(cf.id IS NOT NULL, FALSE) AS is_completed,
    cf.id AS feedback_id,
    cf.cleanliness_rating::TEXT,
    cf.notes AS feedback_notes,
    cf.completed_at AS feedback_completed_at,
    si.booking_uid,
    si.status,
    si.source,
    msr.frequency AS manual_rule_frequency
  FROM schedule_items si
  INNER JOIN listings l ON si.listing_id = l.id
  INNER JOIN profiles p ON l.user_id = p.id
  INNER JOIN cleaners c ON si.cleaner_id = c.id
  LEFT JOIN cleaner_feedback cf ON si.id = cf.schedule_item_id
  LEFT JOIN manual_schedule_rules msr ON si.manual_rule_id = msr.id
  WHERE si.cleaner_id = v_cleaner_id
  AND si.status != 'cancelled'
  ORDER BY si.check_out ASC;
END;
$$;

-- Grant execute permission to anon role (for unauthenticated access)
GRANT EXECUTE ON FUNCTION get_cleaner_schedule_by_token(TEXT) TO anon;

-- Test the updated function
SELECT * FROM get_cleaner_schedule_by_token('4f0d1d648c3fb9d5531765354dc0797b2b13259dd798293d052e47f2d45a8e63');