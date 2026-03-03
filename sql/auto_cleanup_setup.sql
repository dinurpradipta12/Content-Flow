-- ==========================================================
-- AUTO CLEANUP SETUP untuk Content-Flow (Supabase)
-- Jalankan SQL ini di Supabase SQL Editor (satu kali saja)
-- ==========================================================

-- LANGKAH 1: Aktifkan ekstensi pg_cron (hanya sekali)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==========================================================
-- LANGKAH 2: Hapus jadwal lama jika ada (untuk re-run aman)
-- ==========================================================
SELECT cron.unschedule('cleanup-approved-requests')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-approved-requests');
SELECT cron.unschedule('cleanup-rejected-requests')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rejected-requests');
SELECT cron.unschedule('cleanup-old-notifications')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-notifications');
SELECT cron.unschedule('cleanup-old-activity-logs')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-activity-logs');
SELECT cron.unschedule('cleanup-old-chat-messages')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-chat-messages');

-- ==========================================================
-- LANGKAH 3: Daftarkan Jadwal Pembersihan Otomatis
-- ==========================================================

-- [1] Hapus Approval Request yang sudah "Approved" setelah 7 hari
--     Approval_logs ikut terhapus otomatis (ON DELETE CASCADE)
SELECT cron.schedule(
    'cleanup-approved-requests',   -- Nama tugas
    '0 2 * * *',                   -- Setiap hari jam 02:00 pagi WIB
    $$
    DELETE FROM public.approval_requests
    WHERE status = 'Approved'
      AND updated_at < now() - interval '7 days';
    $$
);

-- [2] Hapus Approval Request yang "Rejected" atau "Returned" setelah 30 hari
SELECT cron.schedule(
    'cleanup-rejected-requests',
    '10 2 * * *',                  -- Setiap hari jam 02:10 pagi
    $$
    DELETE FROM public.approval_requests
    WHERE status IN ('Rejected', 'Returned')
      AND updated_at < now() - interval '30 days';
    $$
);

-- [3] Hapus Notifikasi yang sudah dibaca lebih dari 14 hari
SELECT cron.schedule(
    'cleanup-old-notifications',
    '20 2 * * *',                  -- Setiap hari jam 02:20 pagi
    $$
    DELETE FROM public.notifications
    WHERE is_read = true
      AND created_at < now() - interval '14 days';
    $$
);

-- [4] Hapus Activity Logs yang lebih dari 30 hari
--     (Hanya simpan log penting: LOGIN, REGISTER, INVITE)
SELECT cron.schedule(
    'cleanup-old-activity-logs',
    '30 2 * * *',                  -- Setiap hari jam 02:30 pagi
    $$
    DELETE FROM public.activity_logs
    WHERE created_at < now() - interval '30 days'
      AND action NOT IN ('REGISTER', 'INVITE_USER', 'VERIFY_USER');
    $$
);

-- [5] Hapus pesan chat yang lebih dari 90 hari
SELECT cron.schedule(
    'cleanup-old-chat-messages',
    '40 2 * * *',                  -- Setiap hari jam 02:40 pagi
    $$
    DELETE FROM public.workspace_chat_messages
    WHERE created_at < now() - interval '90 days';
    $$
);

-- ==========================================================
-- LANGKAH 4: Verifikasi - Cek semua jadwal yang aktif
-- ==========================================================
SELECT jobname, schedule, command, active
FROM cron.job
ORDER BY jobname;

-- ==========================================================
-- LANGKAH 5: (OPSIONAL) Cleanup Manual Sekarang
-- Jalankan bagian ini jika ingin langsung membersihkan data lama
-- ==========================================================

/*
-- Hapus approval yang sudah Approved lebih dari 7 hari
DELETE FROM public.approval_requests
WHERE status = 'Approved'
  AND updated_at < now() - interval '7 days';

-- Hapus notifikasi yang sudah dibaca lebih dari 14 hari
DELETE FROM public.notifications
WHERE is_read = true
  AND created_at < now() - interval '14 days';

-- Hapus activity logs lebih dari 30 hari
DELETE FROM public.activity_logs
WHERE created_at < now() - interval '30 days'
  AND action NOT IN ('REGISTER', 'INVITE_USER', 'VERIFY_USER');

-- Cek ukuran tabel setelah cleanup
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
*/
