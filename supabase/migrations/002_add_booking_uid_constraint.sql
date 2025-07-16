-- Add unique constraint on booking_uid to prevent duplicate bookings
-- This allows us to use ON CONFLICT when syncing calendars
ALTER TABLE public.schedule_items
ADD CONSTRAINT schedule_items_booking_uid_unique UNIQUE (booking_uid);

-- Add index for better performance when looking up by booking_uid
CREATE INDEX IF NOT EXISTS idx_schedule_items_booking_uid ON public.schedule_items(booking_uid);

-- Add index for efficient filtering of future bookings
CREATE INDEX IF NOT EXISTS idx_schedule_items_check_out ON public.schedule_items(check_out);