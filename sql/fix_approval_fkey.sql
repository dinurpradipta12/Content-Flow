-- ================================================================
-- Fix Foreign Key for Inline Approval
-- ================================================================

-- 1. Hapus constraint lama jika ada (mungkin salah path atau nama)
ALTER TABLE public.content_items 
DROP CONSTRAINT IF EXISTS content_items_approved_by_fkey;

-- 2. Tambahkan kembali dengan referensi yang benar
-- Jika aplikasi menggunakan app_users sebagai tabel detil user, kita referensikan ke sana
-- Namun biasanya auth.users adalah sumber utama ID. 
-- Kita coba referensikan ke auth.users(id) terlebih dulu karena itu standar Supabase.
-- Jika error "table users" muncul lagi, berarti ada kebingungan skema.

ALTER TABLE public.content_items
ADD CONSTRAINT content_items_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Pastikan kolom id di app_users juga valid (jika ada trigger sinkronisasi)
-- Jika constraint masih gagal saat update, berarti user_id di localStorage bukan UUID yang terdaftar di auth.users

-- Debug: Cek apakah ada data yang "ngambang" (approved_by tidak ada di auth.users)
UPDATE public.content_items SET approved_by = NULL WHERE approved_by IS NOT NULL AND approved_by NOT IN (SELECT id FROM auth.users);
