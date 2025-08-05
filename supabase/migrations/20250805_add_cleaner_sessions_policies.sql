-- Add missing RLS policies for cleaner_sessions table
-- This allows managers to create and view share tokens for their cleaners

-- Allow managers to create share tokens (sessions) for their cleaners
CREATE POLICY "Managers can create cleaner sessions"
  ON public.cleaner_sessions
  FOR INSERT
  WITH CHECK (
    cleaner_id IN (
      SELECT id FROM public.cleaners 
      WHERE user_id = auth.uid()
    )
  );

-- Allow managers to view sessions for their cleaners
CREATE POLICY "Managers can view cleaner sessions"
  ON public.cleaner_sessions
  FOR SELECT
  USING (
    cleaner_id IN (
      SELECT id FROM public.cleaners 
      WHERE user_id = auth.uid()
    )
  );

-- Allow managers to update sessions for their cleaners (for extending expiry if needed)
CREATE POLICY "Managers can update cleaner sessions"
  ON public.cleaner_sessions
  FOR UPDATE
  USING (
    cleaner_id IN (
      SELECT id FROM public.cleaners 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    cleaner_id IN (
      SELECT id FROM public.cleaners 
      WHERE user_id = auth.uid()
    )
  );

-- Allow managers to delete sessions for their cleaners
CREATE POLICY "Managers can delete cleaner sessions"
  ON public.cleaner_sessions
  FOR DELETE
  USING (
    cleaner_id IN (
      SELECT id FROM public.cleaners 
      WHERE user_id = auth.uid()
    )
  );