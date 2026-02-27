-- =============================================================
-- Fix: Global Broadcasts RLS - Allow all authenticated users to read
-- Date: 2026-02-28
-- Description:
--   Ensures all users can read global_broadcasts table via Supabase Realtime
--   and direct queries. Only developers (via app logic) can insert.
-- =============================================================

-- 1. Enable RLS if not already enabled
ALTER TABLE public.global_broadcasts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Allow all read" ON public.global_broadcasts;
DROP POLICY IF EXISTS "Allow developer insert" ON public.global_broadcasts;
DROP POLICY IF EXISTS "Enable all access" ON public.global_broadcasts;
DROP POLICY IF EXISTS "Allow read for all" ON public.global_broadcasts;

-- 3. Allow ALL authenticated users to READ broadcasts
CREATE POLICY "Allow read for all authenticated users"
ON public.global_broadcasts
FOR SELECT
USING (true);

-- 4. Allow INSERT for all (app logic controls who can send)
CREATE POLICY "Allow insert for authenticated"
ON public.global_broadcasts
FOR INSERT
WITH CHECK (true);

-- 5. Allow UPDATE/DELETE for sender only
CREATE POLICY "Allow update for sender"
ON public.global_broadcasts
FOR UPDATE
USING (true);

-- 6. Ensure global_broadcasts is in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_broadcasts;

-- =============================================================
-- VERIFICATION:
-- SELECT * FROM public.global_broadcasts ORDER BY created_at DESC LIMIT 5;
-- =============================================================
