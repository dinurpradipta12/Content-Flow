-- SUPABASE OPTIMIZATION & SCHEMA UPDATE 2026
-- Copy and paste this into your Supabase SQL Editor

-- 1. Update developer_inbox schema for Analytics
ALTER TABLE public.developer_inbox 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'verification',
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS package_name text DEFAULT 'Personal';

-- 2. Performance Indexes (Mental Optimization)
-- Faster user filtering
CREATE INDEX IF NOT EXISTS idx_users_active ON public.app_users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_package ON public.app_users(subscription_package);
CREATE INDEX IF NOT EXISTS idx_users_parent ON public.app_users(parent_user_id);

-- Faster analytics and dashboard loading
CREATE INDEX IF NOT EXISTS idx_content_date ON public.content_items(date);
CREATE INDEX IF NOT EXISTS idx_content_workspace ON public.content_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON public.content_items(status);

-- Faster inbox and payment history
CREATE INDEX IF NOT EXISTS idx_inbox_resolved_type ON public.developer_inbox(is_resolved, type);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON public.developer_inbox(created_at DESC);

-- 3. Cleanup & Fixes
-- Ensure RLS is active but readable for development (adjust as needed for production)
ALTER TABLE public.developer_inbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON public.developer_inbox;
CREATE POLICY "Enable all access" ON public.developer_inbox FOR ALL USING (true) WITH CHECK (true);

-- 4. Subscription tracking triggers (Optional but recommended)
-- This ensures that if a package name is updated, it propagates correctly if needed.
-- [Add any triggers here if necessary]

-- DONE! Tables updated and indexes added.
