-- Migration to add user presence tracking
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Ensure the columns are available for Realtime
-- Use SET instead of ADD to avoid duplicate membership error
ALTER PUBLICATION supabase_realtime SET TABLE public.app_users;
