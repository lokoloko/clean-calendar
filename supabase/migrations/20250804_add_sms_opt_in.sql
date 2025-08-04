-- Add SMS opt-in tracking to cleaners table
ALTER TABLE public.cleaners 
ADD COLUMN IF NOT EXISTS sms_opted_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_opted_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_invite_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_cleaners_sms_invite_token ON public.cleaners(sms_invite_token) WHERE sms_invite_token IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.cleaners.sms_opted_in IS 'Whether the cleaner has opted in to receive SMS notifications';
COMMENT ON COLUMN public.cleaners.sms_opted_in_at IS 'Timestamp when the cleaner opted in';
COMMENT ON COLUMN public.cleaners.sms_opt_out_at IS 'Timestamp when the cleaner opted out';
COMMENT ON COLUMN public.cleaners.sms_invite_sent_at IS 'Last time an SMS invite was sent';
COMMENT ON COLUMN public.cleaners.sms_invite_token IS 'Unique token for opt-in link';