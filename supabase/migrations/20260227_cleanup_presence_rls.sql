-- =============================================================
-- CLEANUP: Drop incorrect RLS policies before running updated migration
-- Run this FIRST if you encounter policy errors
-- =============================================================

-- Drop the problematic policies that use auth.uid()
DROP POLICY IF EXISTS "Allow users to update their own presence" ON public.app_users;
DROP POLICY IF EXISTS "Allow presence updates subscription" ON public.app_users;
DROP POLICY IF EXISTS "Allow read access for presence tracking" ON public.app_users;

-- After running this, run 20260227_enable_presence_rls.sql again
-- The new policies use 'true' which is compatible with custom auth system
