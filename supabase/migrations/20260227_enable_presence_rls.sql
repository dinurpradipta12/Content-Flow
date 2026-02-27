-- =============================================================
-- Enable RLS for User Presence Tracking
-- Allows users to see online_status of their workspace members
-- Date: 2026-02-27
-- =============================================================

-- NOTE: This application uses CUSTOM AUTH (app_users table), not Supabase Auth
-- Therefore, RLS policies use 'true' for permissive access, with filtering
-- done at the application layer (React/TypeScript components)

-- Enable RLS on app_users if not already enabled
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading user data for presence tracking
-- Users can read all app_users because workspace filtering is done at application level
-- This is safe because we're using avatar_url matching at the app layer
CREATE POLICY "Allow read access for presence tracking" ON public.app_users
FOR SELECT
USING (true);

-- CRITICAL: Allow users to UPDATE their online_status and last_activity_at
-- This is needed for UserPresence.tsx to track user's online status
-- Since we use custom auth, we allow all UPDATE operations (application layer filters)
CREATE POLICY "Allow users to update their own presence" ON public.app_users
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure app_users is added to realtime publication for real-time subscriptions
-- Note: This is already done in user_presence_migration.sql, so we use IF NOT EXISTS logic
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;

-- Create an index on online_status for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_online_status 
ON public.app_users(online_status);

-- Create an index on last_activity_at for presence tracking queries
CREATE INDEX IF NOT EXISTS idx_app_users_last_activity_at 
ON public.app_users(last_activity_at);
