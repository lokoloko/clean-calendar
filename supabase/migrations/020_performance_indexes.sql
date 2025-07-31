-- Performance optimization indexes based on query analysis
-- Created: 2025-07-30

-- Schedule queries optimization
-- Most common query pattern: WHERE user_id = ? AND date >= ? ORDER BY date
CREATE INDEX IF NOT EXISTS idx_schedule_date_listing 
ON schedule_items(date, listing_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_user_date 
ON schedule_items(user_id, date) 
WHERE deleted_at IS NULL;

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_schedule_composite 
ON schedule_items(user_id, date, listing_id) 
WHERE deleted_at IS NULL;

-- Cleaner assignments optimization
-- Common pattern: Find cleaners for a listing
CREATE INDEX IF NOT EXISTS idx_cleaners_assignment 
ON cleaner_assignments(listing_id, cleaner_id);

-- Reverse lookup: Find listings for a cleaner
CREATE INDEX IF NOT EXISTS idx_cleaners_assignment_reverse 
ON cleaner_assignments(cleaner_id, listing_id);

-- Bookings optimization
-- Common pattern: Active bookings by status
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(status, check_out) 
WHERE status != 'cancelled';

-- Bookings by listing and date
CREATE INDEX IF NOT EXISTS idx_bookings_listing_date 
ON bookings(listing_id, check_in, check_out);

-- User profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user 
ON profiles(user_id);

-- Feedback queries optimization
CREATE INDEX IF NOT EXISTS idx_feedback_schedule 
ON feedback(schedule_item_id);

CREATE INDEX IF NOT EXISTS idx_feedback_created 
ON feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_rating 
ON feedback(cleanliness_rating);

-- Listings by user (for dashboard)
CREATE INDEX IF NOT EXISTS idx_listings_user 
ON listings(user_id) 
WHERE deleted_at IS NULL;

-- Cleaners by user (for dashboard)
CREATE INDEX IF NOT EXISTS idx_cleaners_user 
ON cleaners(user_id) 
WHERE deleted_at IS NULL;

-- Manual schedules by user
CREATE INDEX IF NOT EXISTS idx_manual_schedules_user 
ON manual_schedules(user_id) 
WHERE deleted_at IS NULL;

-- Share tokens lookup
CREATE INDEX IF NOT EXISTS idx_share_tokens_token 
ON share_tokens(token) 
WHERE expires_at > NOW();

-- Notification schedule lookups
CREATE INDEX IF NOT EXISTS idx_notification_schedule_user 
ON notification_schedule(user_id, next_send_at) 
WHERE active = true;

-- Analyze tables after creating indexes
ANALYZE schedule_items;
ANALYZE cleaner_assignments;
ANALYZE bookings;
ANALYZE profiles;
ANALYZE feedback;
ANALYZE listings;
ANALYZE cleaners;
ANALYZE manual_schedules;
ANALYZE share_tokens;
ANALYZE notification_schedule;

-- Add comment explaining indexes
COMMENT ON INDEX idx_schedule_date_listing IS 'Optimize schedule queries by date and listing';
COMMENT ON INDEX idx_schedule_user_date IS 'Optimize user schedule views and dashboard';
COMMENT ON INDEX idx_schedule_composite IS 'Composite index for complex dashboard queries';
COMMENT ON INDEX idx_cleaners_assignment IS 'Optimize cleaner-to-listing lookups';
COMMENT ON INDEX idx_bookings_status IS 'Optimize active booking queries';
COMMENT ON INDEX idx_feedback_schedule IS 'Optimize feedback lookups by schedule item';
COMMENT ON INDEX idx_profiles_user IS 'Optimize user profile lookups';