-- Create user settings table (if it doesn't exist)
-- This migration ensures the user_settings table exists in production

-- First ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then check if the table exists and create it if not
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
    -- Create user settings table
    CREATE TABLE public.user_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL UNIQUE,
      
      -- Calendar sync settings
      auto_sync_enabled BOOLEAN DEFAULT true,
      auto_sync_time TIME DEFAULT '03:00:00',
      
      -- Messaging preferences
      sms_provider VARCHAR(50) DEFAULT 'twilio',
      send_weekly_schedule BOOLEAN DEFAULT true,
      send_daily_reminders BOOLEAN DEFAULT true,
      weekly_schedule_day VARCHAR(10) DEFAULT 'sunday',
      daily_reminder_time TIME DEFAULT '06:00:00',
      require_confirmation BOOLEAN DEFAULT false,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index on user_id for fast lookups
    CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

    -- Create trigger to update updated_at timestamp
    CREATE TRIGGER update_user_settings_updated_at
      BEFORE UPDATE ON public.user_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Insert default settings for existing users
    INSERT INTO public.user_settings (user_id)
    SELECT DISTINCT user_id FROM public.listings
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Created user_settings table';
  ELSE
    RAISE NOTICE 'user_settings table already exists';
  END IF;
END $$;

-- Ensure RLS is enabled (if not already)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "settings_all_own" ON public.user_settings;

-- Create RLS policy for user settings
CREATE POLICY "settings_all_own" ON public.user_settings 
  FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;