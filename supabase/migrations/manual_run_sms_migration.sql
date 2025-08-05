-- Manual migration script to add SMS fields to production database
-- Run this in your Supabase Dashboard SQL Editor

-- First, check if columns already exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'cleaners'
    AND column_name IN ('sms_opted_in', 'sms_opted_in_at', 'sms_opt_out_at', 'sms_invite_sent_at', 'sms_invite_token')
ORDER BY ordinal_position;

-- Add SMS opt-in tracking columns if they don't exist
ALTER TABLE public.cleaners 
ADD COLUMN IF NOT EXISTS sms_opted_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_opted_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_invite_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_cleaners_sms_invite_token ON public.cleaners(sms_invite_token) WHERE sms_invite_token IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.cleaners.sms_opted_in IS 'Whether the cleaner has opted in to receive SMS notifications';
COMMENT ON COLUMN public.cleaners.sms_opted_in_at IS 'Timestamp when the cleaner opted in';
COMMENT ON COLUMN public.cleaners.sms_opt_out_at IS 'Timestamp when the cleaner opted out';
COMMENT ON COLUMN public.cleaners.sms_invite_sent_at IS 'Last time an SMS invite was sent';
COMMENT ON COLUMN public.cleaners.sms_invite_token IS 'Unique token for opt-in link';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'cleaners'
    AND column_name IN ('sms_opted_in', 'sms_opted_in_at', 'sms_opt_out_at', 'sms_invite_sent_at', 'sms_invite_token')
ORDER BY ordinal_position;