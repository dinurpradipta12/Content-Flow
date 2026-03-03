-- ================================================================
-- SQL untuk Menghapus Fitur Messages & Activity Logs dari Supabase
-- Jalankan di Supabase SQL Editor
-- ================================================================
-- PERINGATAN: Ini akan menghapus data secara permanen!
-- Pastikan sudah ada backup sebelum menjalankan perintah ini.
-- ================================================================

-- 1. Hapus tabel Messages & Chat (beserta semua datanya)
DROP TABLE IF EXISTS public.workspace_chat_reads CASCADE;
DROP TABLE IF EXISTS public.workspace_chat_reactions CASCADE;
DROP TABLE IF EXISTS public.workspace_chat_messages CASCADE;
DROP TABLE IF EXISTS public.workspace_chat_members CASCADE;
DROP TABLE IF EXISTS public.workspace_chat_groups CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.chat_typing CASCADE;

-- 2. Hapus tabel Activity Logs (beserta semua datanya)
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- 3. Verifikasi - Cek tabel yang tersisa
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Cek ukuran database setelah penghapusan
SELECT
    pg_size_pretty(pg_database_size(current_database())) AS total_db_size;
