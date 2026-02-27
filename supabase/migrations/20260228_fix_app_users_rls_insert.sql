-- =============================================================
-- Fix app_users RLS for INSERT and DELETE
-- Allows registration and member removal in the custom auth system
-- Date: 2026-02-28
-- =============================================================

-- Target: public.app_users table

-- 1. Drop existing INSERT/DELETE policies if any (cleanup)
DROP POLICY IF EXISTS "Allow user registration" ON public.app_users;
DROP POLICY IF EXISTS "Allow member removal" ON public.app_users;
DROP POLICY IF EXISTS "Enable insert for all" ON public.app_users;
DROP POLICY IF EXISTS "Enable delete for all" ON public.app_users;

-- 2. Create INSERT policy
-- Since the app uses custom auth and a shared client, we allow all inserts
-- and rely on application logic for validation (e.g., Team Management logic)
CREATE POLICY "Enable insert for all" ON public.app_users
FOR INSERT
WITH CHECK (true);

-- 3. Create DELETE policy
-- Allows removing users, primarily for Admins/Owners in Team Management
CREATE POLICY "Enable delete for all" ON public.app_users
FOR DELETE
USING (true);

-- 4. Verify RLS is enabled
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 5. Extra: Ensure permissions are granted to public/anon/authenticated roles
-- This is usually done by default but good for completeness
GRANT ALL ON public.app_users TO anon;
GRANT ALL ON public.app_users TO authenticated;
GRANT ALL ON public.app_users TO service_role;
