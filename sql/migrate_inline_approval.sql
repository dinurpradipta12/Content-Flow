-- ================================================================
-- Migrasi Inline Approval: Memindahkan Approval ke Content Items
-- ================================================================

-- 1. Tambah kolom approval ke tabel content_items (dan betulkan referensi FK ke app_users)
-- Hapus FK jika sebelumnya menunjuk ke tempat yang salah (auth.users)
ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_approved_by_fkey;

ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'revision')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.app_users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approval_notes text;

-- Tambahkan ulang constraint eksplisit untuk keamanan
ALTER TABLE public.content_items 
DROP CONSTRAINT IF EXISTS content_items_approved_by_fkey,
ADD CONSTRAINT content_items_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.app_users(id) ON DELETE SET NULL;

-- 2. Update data lama: set status pending untuk yang kosong
UPDATE public.content_items 
SET approval_status = 'pending' 
WHERE approval_status IS NULL;

-- 3. Hapus tabel-tabel approval lama (HATI-HATI: Data approval lama akan hilang)
DROP TABLE IF EXISTS public.approval_logs CASCADE;
DROP TABLE IF EXISTS public.approval_requests CASCADE;
DROP TABLE IF EXISTS public.approval_templates CASCADE;

-- 4. Berikan akses RLS yang benar untuk kolom baru
-- (Opsional: Jika Anda menggunakan fine-grained RLS, pastikan kolom ini bisa diupdate)

-- 5. Verifikasi kolom baru
SELECT id, title, approval_status FROM public.content_items LIMIT 5;
