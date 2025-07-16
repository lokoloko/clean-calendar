-- Create share tokens table for sharing schedule views
CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  name TEXT, -- Optional name for the share link
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE, -- Optional: filter by specific cleaner
  listing_ids UUID[], -- Optional: filter by specific listings
  date_from DATE, -- Optional: filter by date range
  date_to DATE, -- Optional: filter by date range
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (
    (date_from IS NULL AND date_to IS NULL) OR 
    (date_from IS NOT NULL AND date_to IS NOT NULL AND date_from <= date_to)
  )
);

-- Add comments
COMMENT ON TABLE public.share_tokens IS 'Stores share tokens for public schedule views';
COMMENT ON COLUMN public.share_tokens.token IS 'Unique token for accessing the shared schedule';
COMMENT ON COLUMN public.share_tokens.cleaner_id IS 'Optional filter to show only schedules for a specific cleaner';
COMMENT ON COLUMN public.share_tokens.listing_ids IS 'Optional filter to show only schedules for specific listings';
COMMENT ON COLUMN public.share_tokens.date_from IS 'Optional start date for filtering schedule items';
COMMENT ON COLUMN public.share_tokens.date_to IS 'Optional end date for filtering schedule items';
COMMENT ON COLUMN public.share_tokens.view_count IS 'Number of times this share link has been accessed';

-- Create indexes for performance
CREATE INDEX idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX idx_share_tokens_user_id ON public.share_tokens(user_id);
CREATE INDEX idx_share_tokens_expires_at ON public.share_tokens(expires_at);
CREATE INDEX idx_share_tokens_is_active ON public.share_tokens(is_active);

-- Enable RLS
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own share tokens
CREATE POLICY "Users can view own share tokens" ON public.share_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own share tokens
CREATE POLICY "Users can create own share tokens" ON public.share_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own share tokens
CREATE POLICY "Users can update own share tokens" ON public.share_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own share tokens
CREATE POLICY "Users can delete own share tokens" ON public.share_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can select share tokens by token (for public access)
CREATE POLICY "Public can access active share tokens" ON public.share_tokens
  FOR SELECT USING (is_active = true AND expires_at > NOW());

-- Grant permissions
GRANT ALL ON public.share_tokens TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_tokens TO authenticated;
GRANT SELECT ON public.share_tokens TO anon;
GRANT ALL ON public.share_tokens TO service_role;

-- Add trigger for updated_at
CREATE TRIGGER handle_share_tokens_updated_at BEFORE UPDATE ON public.share_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();