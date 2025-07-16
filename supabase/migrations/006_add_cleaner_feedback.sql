-- Create cleaner_feedback table for tracking cleaning job feedback
CREATE TABLE IF NOT EXISTS public.cleaner_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_item_id UUID NOT NULL REFERENCES public.schedule_items(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    cleanliness_rating VARCHAR(10) CHECK (cleanliness_rating IN ('clean', 'normal', 'dirty')),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_item_id) -- One feedback per schedule item
);

-- Create indexes for better query performance
CREATE INDEX idx_cleaner_feedback_schedule_item ON public.cleaner_feedback(schedule_item_id);
CREATE INDEX idx_cleaner_feedback_cleaner ON public.cleaner_feedback(cleaner_id);
CREATE INDEX idx_cleaner_feedback_listing ON public.cleaner_feedback(listing_id);
CREATE INDEX idx_cleaner_feedback_completed ON public.cleaner_feedback(completed_at);

-- Add RLS policies
ALTER TABLE public.cleaner_feedback ENABLE ROW LEVEL SECURITY;

-- Policy for cleaners to create/update their own feedback
CREATE POLICY "Cleaners can manage their own feedback"
    ON public.cleaner_feedback
    FOR ALL
    USING (cleaner_id IN (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
    ))
    WITH CHECK (cleaner_id IN (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
    ));

-- Policy for property owners to view feedback for their properties
CREATE POLICY "Property owners can view feedback"
    ON public.cleaner_feedback
    FOR SELECT
    USING (listing_id IN (
        SELECT id FROM public.listings WHERE user_id = auth.uid()
    ));

-- Policy for public share tokens to view feedback
CREATE POLICY "Share tokens can view feedback"
    ON public.cleaner_feedback
    FOR SELECT
    USING (true); -- Will be filtered by the API based on share token permissions

-- Add a status column to schedule_items to track completion
ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_cleaner_feedback_updated_at 
    BEFORE UPDATE ON public.cleaner_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create cleaner_auth_codes table for SMS authentication
CREATE TABLE IF NOT EXISTS public.cleaner_auth_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for auth codes
CREATE INDEX idx_cleaner_auth_codes_phone ON public.cleaner_auth_codes(phone_number);
CREATE INDEX idx_cleaner_auth_codes_code ON public.cleaner_auth_codes(code);
CREATE INDEX idx_cleaner_auth_codes_expires ON public.cleaner_auth_codes(expires_at);

-- Add RLS policies for auth codes
ALTER TABLE public.cleaner_auth_codes ENABLE ROW LEVEL SECURITY;

-- Only the system should be able to manage auth codes
CREATE POLICY "System manages auth codes"
    ON public.cleaner_auth_codes
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Create cleaner_sessions table for managing cleaner sessions
CREATE TABLE IF NOT EXISTS public.cleaner_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sessions
CREATE INDEX idx_cleaner_sessions_token ON public.cleaner_sessions(token);
CREATE INDEX idx_cleaner_sessions_cleaner ON public.cleaner_sessions(cleaner_id);
CREATE INDEX idx_cleaner_sessions_expires ON public.cleaner_sessions(expires_at);

-- Add RLS policies for sessions
ALTER TABLE public.cleaner_sessions ENABLE ROW LEVEL SECURITY;

-- Cleaners can only see their own sessions
CREATE POLICY "Cleaners can view their sessions"
    ON public.cleaner_sessions
    FOR SELECT
    USING (cleaner_id IN (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
    ));