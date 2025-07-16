-- Update listings table to support non-Airbnb properties
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS is_active_on_airbnb BOOLEAN DEFAULT true;

-- Make ics_url nullable if it isn't already
DO $$ 
BEGIN
  ALTER TABLE public.listings ALTER COLUMN ics_url DROP NOT NULL;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Add comment
COMMENT ON COLUMN public.listings.is_active_on_airbnb IS 'Whether this listing is currently active on Airbnb';

-- Create manual schedule rules table for recurring cleanings
CREATE TABLE IF NOT EXISTS public.manual_schedule_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('one_time', 'recurring')),
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  days_of_week INTEGER[], -- Array of day numbers (0=Sunday, 6=Saturday)
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  custom_interval_days INTEGER CHECK (custom_interval_days > 0),
  cleaning_time TIME DEFAULT '11:00',
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_recurring_config CHECK (
    schedule_type = 'one_time' OR frequency IS NOT NULL
  ),
  CONSTRAINT valid_weekly_config CHECK (
    frequency NOT IN ('weekly', 'biweekly') OR days_of_week IS NOT NULL
  ),
  CONSTRAINT valid_monthly_config CHECK (
    frequency != 'monthly' OR day_of_month IS NOT NULL
  ),
  CONSTRAINT valid_custom_config CHECK (
    frequency != 'custom' OR custom_interval_days IS NOT NULL
  )
);

-- Update schedule_items table to track source of cleanings
ALTER TABLE public.schedule_items
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'airbnb' CHECK (source IN ('airbnb', 'manual', 'manual_recurring')),
ADD COLUMN IF NOT EXISTS manual_rule_id UUID REFERENCES public.manual_schedule_rules(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN public.schedule_items.source IS 'Source of the cleaning schedule: airbnb (from ICS), manual (one-time), or manual_recurring (from rule)';
COMMENT ON COLUMN public.schedule_items.manual_rule_id IS 'Reference to the manual schedule rule if this was generated from a recurring rule';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_schedule_rules_listing_id ON public.manual_schedule_rules(listing_id);
CREATE INDEX IF NOT EXISTS idx_manual_schedule_rules_cleaner_id ON public.manual_schedule_rules(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_manual_schedule_rules_is_active ON public.manual_schedule_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_items_source ON public.schedule_items(source);
CREATE INDEX IF NOT EXISTS idx_schedule_items_manual_rule_id ON public.schedule_items(manual_rule_id);

-- Enable RLS
ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.manual_schedule_rules TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_schedule_rules TO authenticated;
GRANT SELECT ON public.manual_schedule_rules TO anon;
GRANT ALL ON public.manual_schedule_rules TO service_role;