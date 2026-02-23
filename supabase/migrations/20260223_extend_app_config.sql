-- Migration: Extend App Config for Workspace Management
-- Adds support for dynamic page titles, visibility settings, and version updates

DO $$
BEGIN
    -- 1. Add page_titles column (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_config' AND column_name='page_titles'
    ) THEN
        ALTER TABLE public.app_config ADD COLUMN page_titles JSONB DEFAULT '{
            "dashboard": {"title": "Dashboard", "subtitle": "Berikut laporan performa kontenmu bulan ini."},
            "messages": {"title": "Messages", "subtitle": "Komunikasi tim dalam satu tempat."},
            "plan": {"title": "Content Plan", "subtitle": "Atur jadwal dan strategi kontenmu."},
            "approval": {"title": "Approval", "subtitle": "Review dan setujui konten sebelum publish."},
            "insight": {"title": "Content Data Insight", "subtitle": "Analisa performa konten secara mendalam."},
            "carousel": {"title": "Carousel Maker", "store": "Buat konten carousel dengan mudah."},
            "kpi": {"title": "Team KPI Board", "subtitle": "Pantau performa dan target tim."},
            "team": {"title": "Team Management", "subtitle": "Kelola anggota tim dan hak akses."}
        }'::jsonb;
    END IF;

    -- 2. Add hidden_pages column (TEXT array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_config' AND column_name='hidden_pages'
    ) THEN
        ALTER TABLE public.app_config ADD COLUMN hidden_pages TEXT[] DEFAULT '{}';
    END IF;

    -- 3. Add version and changelog columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_config' AND column_name='app_version'
    ) THEN
        ALTER TABLE public.app_config ADD COLUMN app_version TEXT DEFAULT '1.0.0';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_config' AND column_name='changelog'
    ) THEN
        ALTER TABLE public.app_config ADD COLUMN changelog TEXT DEFAULT 'Initial release';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_config' AND column_name='last_update_notif'
    ) THEN
        ALTER TABLE public.app_config ADD COLUMN last_update_notif TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;
