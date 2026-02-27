-- ============================================================================
-- FIX INVITED USERS MIGRATION FAILURE
-- Tanggal: February 27, 2026
-- Deskripsi: Perbaiki users yang diundang melalui Team Management yang gagal migrasi
-- 
-- Issue: Users yang diundang tidak memiliki email dan subscription_package yang lengkap
--        menyebabkan migration failure saat login
-- ============================================================================

-- 1. Update users tanpa email (invited users) dengan synthetic email
UPDATE public.app_users 
SET email = LOWER(username) || '@team.contentflow.app'
WHERE email IS NULL 
   OR email = '' 
   OR email NOT LIKE '%@%';

-- 2. Update users tanpa subscription_package dengan default 'Free'
UPDATE public.app_users 
SET subscription_package = 'Free'
WHERE subscription_package IS NULL 
   OR subscription_package = '';

-- 3. Update users tanpa subscription_end date dengan 30 hari dari sekarang
UPDATE public.app_users 
SET subscription_end = NOW() + INTERVAL '30 days'
WHERE subscription_end IS NULL 
  AND is_active = true;

-- 4. Ensure invited users yang tidak terverifikasi tetap auto-verified jika dibuat oleh admin
UPDATE public.app_users 
SET is_verified = true
WHERE is_verified = false 
  AND invited_by IS NOT NULL;

-- ============================================================================
-- OPTIONAL: Verify hasilnya dengan query berikut (jangan jalankan, hanya untuk cek)
-- ============================================================================

-- SELECT id, username, email, subscription_package, subscription_end, is_verified, invited_by
-- FROM public.app_users
-- WHERE invited_by IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ============================================================================
-- OPTIONAL: Jika perlu lihat users yang masih belum valid
-- ============================================================================

-- SELECT id, username, email, subscription_package, subscription_end
-- FROM public.app_users
-- WHERE email IS NULL 
--    OR email = '' 
--    OR email NOT LIKE '%@%'
--    OR subscription_package IS NULL
--    OR subscription_package = '';
