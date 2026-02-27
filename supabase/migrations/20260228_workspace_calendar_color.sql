-- =============================================================
-- Migration: Add calendar_color column to workspaces table
-- Date: 2026-02-28
-- Description:
--   Adds a 'calendar_color' column (hex color string) to workspaces
--   so each workspace can have a custom color for calendar cards.
--   This is separate from the 'color' column (which is a theme name).
-- =============================================================

-- 1. Add calendar_color column (hex color, e.g. '#8b5cf6')
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS calendar_color TEXT DEFAULT NULL;

-- 2. Add comment for documentation
COMMENT ON COLUMN public.workspaces.calendar_color IS 
'Custom hex color for calendar card display (e.g. #8b5cf6). 
 If NULL, falls back to the default color based on workspace color theme.';

-- =============================================================
-- VERIFICATION QUERY:
-- =============================================================
-- SELECT id, name, color, calendar_color FROM public.workspaces LIMIT 10;
