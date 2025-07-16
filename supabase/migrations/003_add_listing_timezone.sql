-- Add timezone field to listings table
ALTER TABLE public.listings
ADD COLUMN timezone TEXT DEFAULT 'America/New_York';

-- Add comment to explain the field
COMMENT ON COLUMN public.listings.timezone IS 'IANA timezone identifier for the listing location (e.g., America/New_York, Europe/London)';