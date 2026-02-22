-- ============================================
-- Team KPI Board - Migration Script
-- Jalankan di Supabase SQL Editor
-- Script ini aman dijalankan berulang kali
-- ============================================

-- 1. Table: Team Members (extended profile for KPI tracking)
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NULL,
  full_name text NOT NULL,
  role text DEFAULT 'Member',
  department text DEFAULT '',
  avatar_url text DEFAULT '',
  status text DEFAULT 'active',
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL
);

-- 2. Table: Team KPIs (individual KPI items per member)
CREATE TABLE IF NOT EXISTS public.team_kpis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  member_id uuid NOT NULL,
  metric_name text NOT NULL,
  category text DEFAULT 'General',
  target_value numeric NOT NULL DEFAULT 0,
  actual_value numeric NOT NULL DEFAULT 0,
  unit text DEFAULT '%',
  period text NOT NULL DEFAULT 'monthly',
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  CONSTRAINT team_kpis_pkey PRIMARY KEY (id),
  CONSTRAINT team_kpis_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.team_members(id) ON DELETE CASCADE
);

-- 3. Migrations: Add columns if table already exists (safe to re-run)
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS department text DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.team_kpis ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';
ALTER TABLE public.team_kpis ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 4. Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_kpis ENABLE ROW LEVEL SECURITY;

-- 5. Policies (allow all for simplicity, same pattern as existing tables)
DROP POLICY IF EXISTS "Enable all access" ON public.team_members;
DROP POLICY IF EXISTS "Enable all access" ON public.team_kpis;

CREATE POLICY "Enable all access" ON public.team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.team_kpis FOR ALL USING (true) WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_kpis_member_id ON public.team_kpis(member_id);
CREATE INDEX IF NOT EXISTS idx_team_kpis_period_date ON public.team_kpis(period_date);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
