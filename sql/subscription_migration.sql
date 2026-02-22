-- ============================================
-- Subscription & User Management - Migration
-- Jalankan di Supabase SQL Editor
-- Script ini aman dijalankan berulang kali
-- ============================================

-- Add subscription columns to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_start date DEFAULT current_date;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS subscription_end date;
