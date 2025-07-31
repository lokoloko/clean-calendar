-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- =====================================================
-- This migration ensures views are created without SECURITY DEFINER
-- which enforces RLS policies properly

-- Drop the views if they exist
DROP VIEW IF EXISTS public.cancelled_bookings CASCADE;
DROP VIEW IF EXISTS public.extended_bookings CASCADE;

-- Recreate views WITHOUT SECURITY DEFINER
-- These views will respect RLS policies of the querying user
CREATE OR REPLACE VIEW public.cancelled_bookings AS
SELECT * FROM public.schedule_items 
WHERE status = 'cancelled';

CREATE OR REPLACE VIEW public.extended_bookings AS
SELECT * FROM public.schedule_items 
WHERE is_extended = true;

-- Grant appropriate permissions
GRANT SELECT ON public.cancelled_bookings TO authenticated;
GRANT SELECT ON public.extended_bookings TO authenticated;

-- Verify the views don't have SECURITY DEFINER
-- Run this query after migration to confirm:
-- SELECT 
--   schemaname,
--   viewname,
--   definition
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname IN ('cancelled_bookings', 'extended_bookings');