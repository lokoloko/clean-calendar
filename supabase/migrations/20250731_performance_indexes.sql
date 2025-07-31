-- Performance indexes for GoStudioM (formerly CleanSweep) Scheduler
-- These indexes optimize common query patterns identified in the codebase

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_active ON public.listings(user_id, is_active_on_airbnb);

-- Cleaners indexes
CREATE INDEX IF NOT EXISTS idx_cleaners_user_id ON public.cleaners(user_id);
CREATE INDEX IF NOT EXISTS idx_cleaners_phone ON public.cleaners(phone) WHERE phone IS NOT NULL;

-- Schedule items indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_schedule_listing_id ON public.schedule_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_schedule_cleaner_id ON public.schedule_items(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_check_out ON public.schedule_items(check_out);
CREATE INDEX IF NOT EXISTS idx_schedule_check_in ON public.schedule_items(check_in);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON public.schedule_items(status);
CREATE INDEX IF NOT EXISTS idx_schedule_source ON public.schedule_items(source);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schedule_listing_checkout ON public.schedule_items(listing_id, check_out);
CREATE INDEX IF NOT EXISTS idx_schedule_cleaner_checkout ON public.schedule_items(cleaner_id, check_out);
CREATE INDEX IF NOT EXISTS idx_schedule_completed ON public.schedule_items(is_completed) WHERE is_completed = true;

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_listing_id ON public.assignments(listing_id);
CREATE INDEX IF NOT EXISTS idx_assignments_cleaner_id ON public.assignments(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_assignments_listing_cleaner ON public.assignments(listing_id, cleaner_id);

-- Cleaner feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_schedule_item ON public.cleaner_feedback(schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_feedback_listing_id ON public.cleaner_feedback(listing_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cleaner_id ON public.cleaner_feedback(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.cleaner_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.cleaner_feedback(cleanliness_rating) WHERE cleanliness_rating IS NOT NULL;

-- Listing sync status indexes
CREATE INDEX IF NOT EXISTS idx_sync_status_listing ON public.listing_sync_status(listing_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_last_sync ON public.listing_sync_status(last_synced_at);

-- Share tokens indexes
CREATE INDEX IF NOT EXISTS idx_share_tokens_user_id ON public.share_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_active ON public.share_tokens(is_active, expires_at) WHERE is_active = true;

-- Cleaner sessions indexes
CREATE INDEX IF NOT EXISTS idx_cleaner_sessions_token ON public.cleaner_sessions(token);
CREATE INDEX IF NOT EXISTS idx_cleaner_sessions_cleaner ON public.cleaner_sessions(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_sessions_expires ON public.cleaner_sessions(expires_at);

-- Cleaner auth codes indexes
CREATE INDEX IF NOT EXISTS idx_auth_codes_phone ON public.cleaner_auth_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_auth_codes_cleaner ON public.cleaner_auth_codes(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_unused ON public.cleaner_auth_codes(phone_number, code, expires_at) WHERE used_at IS NULL;

-- Manual schedule rules indexes
CREATE INDEX IF NOT EXISTS idx_manual_rules_listing ON public.manual_schedule_rules(listing_id);
CREATE INDEX IF NOT EXISTS idx_manual_rules_cleaner ON public.manual_schedule_rules(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_manual_rules_active ON public.manual_schedule_rules(is_active) WHERE is_active = true;

-- Profiles indexes (for user queries)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE public.listings;
ANALYZE public.cleaners;
ANALYZE public.schedule_items;
ANALYZE public.assignments;
ANALYZE public.cleaner_feedback;
ANALYZE public.listing_sync_status;
ANALYZE public.share_tokens;
ANALYZE public.cleaner_sessions;
ANALYZE public.cleaner_auth_codes;
ANALYZE public.manual_schedule_rules;
ANALYZE public.profiles;