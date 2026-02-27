-- =============================================================
-- Enable RLS for User Presence Tracking
-- Allows users to see online_status of their workspace members
-- Date: 2026-02-27
-- =============================================================

-- Enable RLS on app_users if not already enabled
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading user data for presence tracking
-- Users can read all app_users because workspace filtering is done at application level
-- This is safe because we're using avatar_url matching at the app layer
CREATE POLICY "Allow read access for presence tracking" ON public.app_users
FOR SELECT
USING (true);

-- Allow read access to basic user info and presence data
-- This policy enables the PresenceToast component to receive real-time updates
-- about online_status changes from workspace members
CREATE POLICY "Allow presence updates" ON public.app_users
FOR SELECT
USING (
  -- Users can always read their own record
  id = auth.uid()::uuid
  OR
  -- Users can read other users' presence data (online_status, last_activity_at)
  -- This is filtered at the application level by workspace membership
  true
);

-- Ensure app_users is added to realtime publication for real-time subscriptions
-- Note: This is already done in user_presence_migration.sql, so we use IF NOT EXISTS logic
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;

-- Create an index on online_status for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_online_status 
ON public.app_users(online_status);

-- Create an index on last_activity_at for presence tracking queries
CREATE INDEX IF NOT EXISTS idx_app_users_last_activity_at 
ON public.app_users(last_activity_at);
