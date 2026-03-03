-- ================================================================
-- FINAL FIX: INTEGRITY INTEGRATION UNTUK APPROVAL
-- ================================================================

-- 1. Hapus constraint lama yang mungkin salah arah (ke auth.users)
ALTER TABLE public.content_items 
DROP CONSTRAINT IF EXISTS content_items_approved_by_fkey;

-- 2. Pastikan kolom approved_by bertipe UUID
-- (Jika sebelumnya text, kita ubah ke UUID)
DO $$ 
BEGIN
    ALTER TABLE public.content_items ALTER COLUMN approved_by TYPE uuid USING approved_by::uuid;
EXCEPTION WHEN others THEN
    -- jika gagal casting, biarkan saja atau handle manual
END $$;

-- 3. Tambahkan kembali constraint yang merujuk ke public.app_users(id)
-- Kita gunakan public.app_users karena aplikasi ini mengelola profil di sana.
ALTER TABLE public.content_items
ADD CONSTRAINT content_items_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.app_users(id) ON DELETE SET NULL;

-- 4. Sinkronisasi data yang melanggar (opsional tapi disarankan)
-- Jika ada ID yang tidak ada di app_users, set ke NULL agar tidak error 23503
UPDATE public.content_items 
SET approved_by = NULL 
WHERE approved_by IS NOT NULL 
AND approved_by NOT IN (SELECT id FROM public.app_users);

-- 5. Pastikan RLS mengizinkan update kolom baru
-- (Jika Admin/Owner, mereka harus bisa update kolom approval_*)
-- Contoh policy umum (pastikan sesuaikan dengan sistem RLS Anda):
-- DROP POLICY IF EXISTS "Admins can approve content" ON public.content_items;
-- CREATE POLICY "Admins can approve content" ON public.content_items
-- FOR UPDATE USING ( true ) WITH CHECK ( true );

-- Verifikasi akhir
SELECT conname, confrelid::regclass 
FROM pg_constraint 
WHERE conname = 'content_items_approved_by_fkey';
