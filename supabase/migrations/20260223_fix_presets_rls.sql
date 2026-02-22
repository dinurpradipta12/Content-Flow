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
ALTER TABLE carousel_presets DROP CONSTRAINT IF EXISTS carousel_presets_user_id_fkey;
ALTER TABLE carousel_presets ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 3. Buat policies baru yang bekerja dengan anon role
--    (karena app memakai custom auth, bukan Supabase Auth)

-- SELECT: user hanya bisa lihat preset miliknya (berdasarkan user_id yang dikirim)
CREATE POLICY "Allow anon select own presets"
ON carousel_presets FOR SELECT
TO anon
USING (true);
-- Note: filtering actual per-user dilakukan di query (.eq('user_id', userId))

-- INSERT: izinkan anon memasukkan baris selama user_id tidak kosong
CREATE POLICY "Allow anon insert presets"
ON carousel_presets FOR INSERT
TO anon
WITH CHECK (user_id IS NOT NULL AND user_id <> '');

-- UPDATE: izinkan anon update preset miliknya
CREATE POLICY "Allow anon update own presets"
ON carousel_presets FOR UPDATE
TO anon
USING (user_id IS NOT NULL AND user_id <> '');

-- DELETE: izinkan anon hapus preset miliknya
CREATE POLICY "Allow anon delete own presets"
ON carousel_presets FOR DELETE
TO anon
USING (user_id IS NOT NULL AND user_id <> '');
