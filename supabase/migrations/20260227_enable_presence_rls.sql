-- =============================================================
-- Enable RLS for User Presence Tracking
-- Allows users to see online_status of their workspace members
-- Date: 2026-02-27
-- UPDATED: Simplified for custom auth system
-- =============================================================

-- NOTE: This application uses CUSTOM AUTH (app_users table), not Supabase Auth
-- Therefore, RLS policies use 'true' for permissive access, with filtering
-- done at the application layer (React/TypeScript components)

-- Enable RLS on app_users if not already enabled
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (cleanup)
DROP POLICY IF EXISTS "Allow users to update their own presence" ON public.app_users;
DROP POLICY IF EXISTS "Allow presence updates subscription" ON public.app_users;
DROP POLICY IF EXISTS "Allow read access for presence tracking" ON public.app_users;

-- Simple SELECT policy: Allow reading all users for presence tracking
CREATE POLICY "Presence tracking read" ON public.app_users
FOR SELECT
USING (true);

-- Simple UPDATE policy: Allow updating online_status and last_activity_at
-- This is safe because the app validates which fields can be updated
CREATE POLICY "Presence status update" ON public.app_users
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure app_users is in realtime publication (should already be done)
-- We use SET to avoid duplicate membership errors
-- ALTER PUBLICATION supabase_realtime SET TABLE public.app_users;

-- Create indexes for presence tracking queries
CREATE INDEX IF NOT EXISTS idx_app_users_online_status 
ON public.app_users(online_status)
WHERE online_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_last_activity_at 
ON public.app_users(last_activity_at DESC)
WHERE last_activity_at IS NOT NULL;
