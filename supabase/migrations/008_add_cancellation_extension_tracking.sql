-- Add fields for tracking cancellations and extensions in schedule_items
ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS original_check_in DATE,
ADD COLUMN IF NOT EXISTS original_check_out DATE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_extended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS extension_notes TEXT,
ADD COLUMN IF NOT EXISTS previous_check_out DATE,
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

-- Create index for faster queries on cancellation status
CREATE INDEX IF NOT EXISTS idx_schedule_items_cancelled_at ON public.schedule_items(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_schedule_items_is_extended ON public.schedule_items(is_extended);

-- Update existing records to set original dates from current dates
UPDATE public.schedule_items 
SET original_check_in = check_in,
    original_check_out = check_out
WHERE original_check_in IS NULL;

-- Add a comment to the table explaining the new fields
COMMENT ON COLUMN public.schedule_items.original_check_in IS 'Original check-in date when booking was first synced';
COMMENT ON COLUMN public.schedule_items.original_check_out IS 'Original check-out date when booking was first synced';
COMMENT ON COLUMN public.schedule_items.cancelled_at IS 'Timestamp when the booking was detected as cancelled';
COMMENT ON COLUMN public.schedule_items.modification_history IS 'JSON array tracking all modifications to the booking';
COMMENT ON COLUMN public.schedule_items.is_extended IS 'Flag indicating if the booking has been extended';
COMMENT ON COLUMN public.schedule_items.extension_notes IS 'Notes about the extension';
COMMENT ON COLUMN public.schedule_items.previous_check_out IS 'Previous check-out date before the most recent extension';
COMMENT ON COLUMN public.schedule_items.extension_count IS 'Number of times this booking has been extended';