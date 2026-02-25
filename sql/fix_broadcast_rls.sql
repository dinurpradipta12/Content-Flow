-- FIX: Enable Insert, Update, and Delete access for global_broadcasts
-- This fixes the 42501 (RLS Violation) error when sending broadcasts.

DROP POLICY IF EXISTS "Public view for global_broadcasts" ON public.global_broadcasts;
DROP POLICY IF EXISTS "Enable all access" ON public.global_broadcasts;

CREATE POLICY "Enable all access" ON public.global_broadcasts
FOR ALL USING (true) WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.global_broadcasts ENABLE ROW LEVEL SECURITY;
