-- Performance optimization functions for stats page

-- Function to get monthly aggregated statistics
CREATE OR REPLACE FUNCTION get_monthly_stats(
  p_user_id UUID,
  p_months_back INTEGER DEFAULT 6
) RETURNS TABLE (
  month DATE,
  total_cleanings BIGINT,
  completed_cleanings BIGINT,
  total_revenue NUMERIC,
  feedback_count BIGINT,
  clean_count BIGINT,
  normal_count BIGINT,
  dirty_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      DATE_TRUNC('month', si.check_out)::DATE as month,
      COUNT(DISTINCT si.id) as total_cleanings,
      COUNT(DISTINCT CASE WHEN si.is_completed OR si.status = 'completed' THEN si.id END) as completed_cleanings,
      SUM(COALESCE(l.cleaning_fee, 0)) as total_revenue,
      COUNT(DISTINCT cf.id) as feedback_count,
      COUNT(DISTINCT CASE WHEN cf.cleanliness_rating = 'clean' THEN cf.id END) as clean_count,
      COUNT(DISTINCT CASE WHEN cf.cleanliness_rating = 'normal' THEN cf.id END) as normal_count,
      COUNT(DISTINCT CASE WHEN cf.cleanliness_rating = 'dirty' THEN cf.id END) as dirty_count
    FROM schedule_items si
    INNER JOIN listings l ON si.listing_id = l.id
    LEFT JOIN cleaner_feedback cf ON cf.schedule_item_id = si.id
    WHERE l.user_id = p_user_id
      AND si.check_out >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * p_months_back)
    GROUP BY DATE_TRUNC('month', si.check_out)
  )
  SELECT 
    month,
    total_cleanings,
    completed_cleanings,
    total_revenue,
    feedback_count,
    clean_count,
    normal_count,
    dirty_count
  FROM monthly_data
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get top cleaners by performance
CREATE OR REPLACE FUNCTION get_top_cleaners(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  cleaner_id UUID,
  cleaner_name TEXT,
  total_cleanings BIGINT,
  completed_cleanings BIGINT,
  feedback_count BIGINT,
  average_rating NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cleaner_stats AS (
    SELECT
      c.id as cleaner_id,
      c.name as cleaner_name,
      COUNT(DISTINCT si.id) as total_cleanings,
      COUNT(DISTINCT CASE WHEN si.is_completed OR si.status = 'completed' THEN si.id END) as completed_cleanings,
      COUNT(DISTINCT cf.id) as feedback_count,
      AVG(CASE 
        WHEN cf.cleanliness_rating = 'clean' THEN 3
        WHEN cf.cleanliness_rating = 'normal' THEN 2
        WHEN cf.cleanliness_rating = 'dirty' THEN 1
        ELSE NULL
      END) as average_rating
    FROM cleaners c
    INNER JOIN schedule_items si ON si.cleaner_id = c.id
    INNER JOIN listings l ON si.listing_id = l.id
    LEFT JOIN cleaner_feedback cf ON cf.schedule_item_id = si.id
    WHERE c.user_id = p_user_id
      AND si.check_out >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY c.id, c.name
  )
  SELECT 
    cleaner_id,
    cleaner_name,
    total_cleanings,
    completed_cleanings,
    feedback_count,
    ROUND(average_rating, 2) as average_rating,
    CASE 
      WHEN total_cleanings > 0 THEN ROUND((completed_cleanings::NUMERIC / total_cleanings) * 100, 1)
      ELSE 0
    END as completion_rate
  FROM cleaner_stats
  WHERE total_cleanings > 0
  ORDER BY 
    completion_rate DESC,
    average_rating DESC NULLS LAST,
    total_cleanings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for stats performance
CREATE INDEX IF NOT EXISTS idx_schedule_items_check_out_listing 
ON schedule_items(check_out, listing_id);

CREATE INDEX IF NOT EXISTS idx_cleaner_feedback_created_schedule 
ON cleaner_feedback(created_at, schedule_item_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_monthly_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_cleaners TO authenticated;