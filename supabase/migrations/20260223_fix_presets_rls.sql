-- ============================================================
-- FIX: carousel_presets RLS untuk custom auth (non-Supabase Auth)
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Drop policies lama yang bergantung pada auth.uid()
DROP POLICY IF EXISTS "Users can view their own presets" ON carousel_presets;
DROP POLICY IF EXISTS "Users can insert their own presets" ON carousel_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON carousel_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON carousel_presets;

-- 2. Ubah tipe kolom user_id dari UUID (refs auth.users) menjadi TEXT
--    agar bisa menerima custom user ID dari localStorage
DO $$
BEGIN
  -- Hapus constraint foreign key jika masih ada
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'carousel_presets_user_id_fkey' 
    AND table_name = 'carousel_presets'
  ) THEN
    ALTER TABLE carousel_presets DROP CONSTRAINT carousel_presets_user_id_fkey;
  END IF;

  -- Ubah tipe kolom menjadi TEXT
  ALTER TABLE carousel_presets ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
END $$;

-- 3. Buat policies baru yang bekerja dengan anon role (Idempotent)

-- SELECT
DO $$
BEGIN
  IF NOT EXISTS (select 1 from pg_policies where policyname = 'Allow anon select own presets' and tablename = 'carousel_presets') then
    CREATE POLICY "Allow anon select own presets" ON carousel_presets FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- INSERT
DO $$
BEGIN
  IF NOT EXISTS (select 1 from pg_policies where policyname = 'Allow anon insert presets' and tablename = 'carousel_presets') then
    CREATE POLICY "Allow anon insert presets" ON carousel_presets FOR INSERT TO anon WITH CHECK (user_id IS NOT NULL AND user_id <> '');
  END IF;
END $$;

-- UPDATE
DO $$
BEGIN
  IF NOT EXISTS (select 1 from pg_policies where policyname = 'Allow anon update own presets' and tablename = 'carousel_presets') then
    CREATE POLICY "Allow anon update own presets" ON carousel_presets FOR UPDATE TO anon USING (user_id IS NOT NULL AND user_id <> '');
  END IF;
END $$;

-- DELETE
DO $$
BEGIN
  IF NOT EXISTS (select 1 from pg_policies where policyname = 'Allow anon delete own presets' and tablename = 'carousel_presets') then
    CREATE POLICY "Allow anon delete own presets" ON carousel_presets FOR DELETE TO anon USING (user_id IS NOT NULL AND user_id <> '');
  END IF;
END $$;
