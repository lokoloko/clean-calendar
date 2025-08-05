-- Create a function to get cleaner schedule via share token
-- This function runs with elevated privileges (SECURITY DEFINER) to bypass RLS
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
  status TEXT
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
    cf.cleanliness_rating,
    cf.notes AS feedback_notes,
    cf.completed_at AS feedback_completed_at,
    si.booking_uid,
    si.status
  FROM schedule_items si
  INNER JOIN listings l ON si.listing_id = l.id
  INNER JOIN profiles p ON l.user_id = p.id
  INNER JOIN cleaners c ON si.cleaner_id = c.id
  LEFT JOIN cleaner_feedback cf ON si.id = cf.schedule_item_id
  WHERE si.cleaner_id = v_cleaner_id
  AND si.status != 'cancelled'
  ORDER BY si.check_out ASC;
END;
$$;

-- Grant execute permission to anon role (for unauthenticated access)
GRANT EXECUTE ON FUNCTION get_cleaner_schedule_by_token(TEXT) TO anon;

-- Also create a function to get cleaner info by token
CREATE OR REPLACE FUNCTION get_cleaner_by_token(share_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email
  FROM cleaner_sessions cs
  INNER JOIN cleaners c ON cs.cleaner_id = c.id
  WHERE cs.token = share_token
  AND cs.expires_at > NOW()
  LIMIT 1;
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION get_cleaner_by_token(TEXT) TO anon;