-- ============================================
-- Subscription & User Management - Migration
-- Jalankan di Supabase SQL Editor
-- Script ini aman dijalankan berulang kali
-- ============================================

-- Add subscription columns to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_start timestamptz DEFAULT current_timestamp;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_end timestamptz;

-- Mengubah tipe kolom yang sudah ada jika masih bertipe "date"
ALTER TABLE public.app_users ALTER COLUMN subscription_start TYPE timestamptz USING subscription_start::timestamptz;
ALTER TABLE public.app_users ALTER COLUMN subscription_end TYPE timestamptz USING subscription_end::timestamptz;

-- Enable Realtime on app_users for live profile sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
