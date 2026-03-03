-- ================================================================
-- Fix RLS Policy untuk tabel push_subscriptions
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- Aktifkan RLS (jika belum)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Enable all access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow insert own subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow select own subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow delete own subscription" ON public.push_subscriptions;

-- Buat policy baru: User bisa insert/update/delete/select subscription milik sendiri
-- Menggunakan user_id dari localStorage (bukan auth.uid karena app menggunakan legacy auth)
CREATE POLICY "Allow all access on push_subscriptions"
ON public.push_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Verifikasi policy
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'push_subscriptions';
