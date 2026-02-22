-- File: sql/admin_tenant_migration_2.sql
-- Ini adalah SQL lanjutan untuk memisahkan data (tenant isolation) tambahan

-- 1. Tambah admin_id ke approval_requests
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_approval_requests_admin_id ON public.approval_requests(admin_id);

-- 2. Tambah admin_id ke team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_team_members_admin_id ON public.team_members(admin_id);
