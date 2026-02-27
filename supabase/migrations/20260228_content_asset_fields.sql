-- =============================================================
-- Migration: Add asset fields to content_items table
-- Date: 2026-02-28
-- Description:
--   Adds two new columns to content_items:
--   - asset_url: For uploaded JPG/image assets (base64 or URL)
--   - drive_folder_url: Google Drive folder link for video/multi-file assets
-- =============================================================

-- 1. Add asset_url column (stores base64 image or URL)
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS asset_url TEXT DEFAULT NULL;

-- 2. Add drive_folder_url column (Google Drive folder link)
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT NULL;

-- 3. Add comments
COMMENT ON COLUMN public.content_items.asset_url IS 
'Uploaded content asset - base64 image for carousel/static content';

COMMENT ON COLUMN public.content_items.drive_folder_url IS 
'Google Drive folder URL containing content assets (images/videos)';

-- =============================================================
-- VERIFICATION:
-- SELECT id, title, asset_url, drive_folder_url FROM public.content_items LIMIT 5;
-- =============================================================
