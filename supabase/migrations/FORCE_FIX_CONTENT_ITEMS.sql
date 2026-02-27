-- =============================================================
-- FORCE FIX CONTENT_ITEMS SCHEMA (DROP FK & CONVERT TO TEXT)
-- Run this in your Supabase SQL Editor.
-- =============================================================

-- 1. Drop the constraints that are blocking the type change
-- We must do this FIRST before changing the column type.
ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_pic_fkey;
ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_approval_fkey;

-- 2. Now convert the columns to TEXT
-- Using 'USING' clause to ensure current UUIDs are cast correctly to text
ALTER TABLE public.content_items 
ALTER COLUMN pic TYPE text USING pic::text,
ALTER COLUMN approval TYPE text USING approval::text;

-- 3. Cleanup: Set defaults if needed and ensure indexes exist
ALTER TABLE public.content_items ALTER COLUMN pic SET DEFAULT null;
ALTER TABLE public.content_items ALTER COLUMN approval SET DEFAULT null;

CREATE INDEX IF NOT EXISTS idx_content_pic ON public.content_items(pic);
CREATE INDEX IF NOT EXISTS idx_content_approval ON public.content_items(approval);

-- 4. VERIFICATION: This should return 'text' for these columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'content_items' 
AND column_name IN ('pic', 'approval');
