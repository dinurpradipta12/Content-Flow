-- =============================================================
-- FINAL FIX FOR PRESENCE TOAST & PERMISSIONS
-- Run this in your Supabase SQL Editor to resolve 403 Forbidden errors.
-- =============================================================

-- 1. Grant base permissions to BOTH anon and authenticated roles
-- (Crucial because the app uses custom auth but anon key)
GRANT ALL ON public.app_users TO anon;
GRANT ALL ON public.app_users TO authenticated;
GRANT ALL ON public.workspaces TO anon;
GRANT ALL ON public.workspaces TO authenticated;

-- 2. Ensure RLS is enabled
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3. Cleanup existing presence policies to prevent "already exists" errors
DROP POLICY IF EXISTS "Presence tracking read" ON public.app_users;
DROP POLICY IF EXISTS "Presence status update" ON public.app_users;
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.app_users;
DROP POLICY IF EXISTS "Allow update for users own record" ON public.app_users;
DROP POLICY IF EXISTS "Allow read access for presence tracking" ON public.app_users;
DROP POLICY IF EXISTS "Presence tracking read" ON public.app_users;
DROP POLICY IF EXISTS "Workspaces read" ON public.workspaces;

-- 4. Create inclusive policies for Custom Auth
-- Allows ALL users to see who is online
CREATE POLICY "Presence tracking read" ON public.app_users
FOR SELECT USING (true);

-- Allows ANYONE to update their status (filtered by ID in application logic)
CREATE POLICY "Presence status update" ON public.app_users
FOR UPDATE USING (true) WITH CHECK (true);

-- Allows ANYONE to read workspace members (to find peers)
CREATE POLICY "Workspaces read" ON public.workspaces
FOR SELECT USING (true);

-- 5. Enable Realtime for the app_users table
-- If this fails, it's usually because it's already there or publication name differs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_users') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
    END IF;
END $$;
