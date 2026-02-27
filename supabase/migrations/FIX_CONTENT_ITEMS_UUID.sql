-- =============================================================
-- FIX CONTENT_ITEMS SCHEMA MISMTACH
-- Run this in your Supabase SQL Editor to fix the "Sarah" UUID error.
-- =============================================================

-- The columns pic and approval should be text because they use 
-- CreatableSelect (allowing arbitrary names) and are used for 
-- display in notifications.

ALTER TABLE public.content_items 
ALTER COLUMN pic TYPE text,
ALTER COLUMN approval TYPE text;

-- Optional: If they were bound to a foreign key, we might need to drop it first.
-- But since they were accidentally UUID, they might have been created with FKs.
-- This command is safe even if there are no FKs.
DO $$ 
BEGIN
    -- Try to drop FKs if they exist (common naming conventions)
    ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_pic_fkey;
    ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_approval_fkey;
EXCEPTION WHEN OTHERS THEN 
    -- Ignore errors if table structure is different
END $$;

-- Verify indexes are still valid (altering type usually keeps indexes but good to check)
CREATE INDEX IF NOT EXISTS idx_content_pic ON public.content_items(pic);
CREATE INDEX IF NOT EXISTS idx_content_approval ON public.content_items(approval);
