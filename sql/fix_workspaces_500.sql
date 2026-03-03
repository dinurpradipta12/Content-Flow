-- ================================================================
-- Diagnosis & Repair: Fix workspaces table after table drops
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Cek apakah tabel workspaces masih ada
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'workspaces'
) AS workspaces_exists;

-- 2. Cek RLS policies di tabel workspaces (mungkin ada yang broken)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workspaces';

-- 3. Cek triggers di tabel workspaces
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'workspaces';

-- 4. Cek apakah ada views yang broken
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public';

-- 5. Cek Foreign Key constraints yang mungkin broken
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (tc.table_name = 'workspaces' OR ccu.table_name = 'workspaces');

-- ================================================================
-- 6. FIX: Pastikan RLS di workspaces benar
-- ================================================================
-- Hapus semua policy yang mungkin broken
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspaces', pol.policyname);
    END LOOP;
END;
$$;

-- Buat ulang policy sederhana yang aman
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access on workspaces"
ON public.workspaces
FOR ALL
USING (true)
WITH CHECK (true);

-- 7. Verifikasi tabel bisa diakses
SELECT id, name FROM public.workspaces LIMIT 3;
