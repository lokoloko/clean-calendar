-- Create user settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
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

-- Insert default settings for existing users (if any)
-- In development, this will create settings for our DEV_USER_ID
INSERT INTO public.user_settings (user_id)
SELECT DISTINCT user_id FROM public.listings
ON CONFLICT (user_id) DO NOTHING;