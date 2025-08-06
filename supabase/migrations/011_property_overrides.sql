-- Property Override System
-- Allows marking properties unavailable and postponing cleanings

-- Create property_overrides table for unavailability periods
CREATE TABLE IF NOT EXISTS public.property_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('unavailable', 'maintenance', 'construction', 'owner_use', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  affects_cleanings BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Create postponed_cleanings table for tracking postponed schedule items
CREATE TABLE IF NOT EXISTS public.postponed_cleanings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_item_id UUID REFERENCES public.schedule_items(id) ON DELETE CASCADE NOT NULL,
  original_date DATE NOT NULL,
  postponed_to_date DATE,
  postpone_reason TEXT,
  postponed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  postponed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'postponed' CHECK (status IN ('postponed', 'rescheduled', 'cancelled'))
);

-- Add override_id column to schedule_items to link to overrides
ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS override_id UUID REFERENCES public.property_overrides(id) ON DELETE SET NULL;

-- Add is_postponed column to schedule_items
ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS is_postponed BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_overrides_listing ON public.property_overrides(listing_id);
CREATE INDEX IF NOT EXISTS idx_property_overrides_dates ON public.property_overrides(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_property_overrides_user ON public.property_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_postponed_cleanings_item ON public.postponed_cleanings(schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_postponed_cleanings_status ON public.postponed_cleanings(status);
CREATE INDEX IF NOT EXISTS idx_schedule_items_override ON public.schedule_items(override_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_postponed ON public.schedule_items(is_postponed);

-- Enable RLS
ALTER TABLE public.property_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postponed_cleanings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_overrides
CREATE POLICY "Users can view their own property overrides"
  ON public.property_overrides
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create property overrides"
  ON public.property_overrides
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own property overrides"
  ON public.property_overrides
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own property overrides"
  ON public.property_overrides
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- RLS Policies for postponed_cleanings
CREATE POLICY "Users can view postponed cleanings for their properties"
  ON public.postponed_cleanings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_items si
      JOIN public.listings l ON si.listing_id = l.id
      WHERE si.id = postponed_cleanings.schedule_item_id
      AND l.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create postponed cleanings for their properties"
  ON public.postponed_cleanings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedule_items si
      JOIN public.listings l ON si.listing_id = l.id
      WHERE si.id = postponed_cleanings.schedule_item_id
      AND l.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update postponed cleanings for their properties"
  ON public.postponed_cleanings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_items si
      JOIN public.listings l ON si.listing_id = l.id
      WHERE si.id = postponed_cleanings.schedule_item_id
      AND l.user_id = (SELECT auth.uid())
    )
  );

-- Function to check if a property is available on a given date
CREATE OR REPLACE FUNCTION is_property_available(
  p_listing_id UUID,
  p_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.property_overrides
    WHERE listing_id = p_listing_id
    AND affects_cleanings = true
    AND p_date BETWEEN start_date AND end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Function to postpone a cleaning
CREATE OR REPLACE FUNCTION postpone_cleaning(
  p_schedule_item_id UUID,
  p_new_date DATE,
  p_reason TEXT
) RETURNS VOID AS $$
DECLARE
  v_original_date DATE;
  v_listing_id UUID;
BEGIN
  -- Get original date and listing
  SELECT check_out, listing_id INTO v_original_date, v_listing_id
  FROM public.schedule_items
  WHERE id = p_schedule_item_id;
  
  -- Check if new date is available
  IF NOT is_property_available(v_listing_id, p_new_date) THEN
    RAISE EXCEPTION 'Property is not available on the selected date';
  END IF;
  
  -- Create postponement record
  INSERT INTO public.postponed_cleanings (
    schedule_item_id,
    original_date,
    postponed_to_date,
    postpone_reason,
    postponed_by
  ) VALUES (
    p_schedule_item_id,
    v_original_date,
    p_new_date,
    p_reason,
    (SELECT auth.uid())
  );
  
  -- Update schedule item
  UPDATE public.schedule_items
  SET 
    check_out = p_new_date,
    check_in = p_new_date - INTERVAL '1 day',
    is_postponed = true,
    updated_at = NOW()
  WHERE id = p_schedule_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk postpone cleanings during an override period
CREATE OR REPLACE FUNCTION bulk_postpone_cleanings(
  p_override_id UUID,
  p_days_to_postpone INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN (
    SELECT si.id, si.check_out
    FROM public.schedule_items si
    JOIN public.property_overrides po ON po.listing_id = si.listing_id
    WHERE po.id = p_override_id
    AND si.check_out BETWEEN po.start_date AND po.end_date
    AND si.status != 'cancelled'
    AND si.is_postponed = false
  ) LOOP
    -- Postpone each cleaning
    PERFORM postpone_cleaning(
      v_item.id,
      v_item.check_out + (p_days_to_postpone || ' days')::INTERVAL,
      'Bulk postponement due to property override'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_overrides_updated_at
  BEFORE UPDATE ON public.property_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();