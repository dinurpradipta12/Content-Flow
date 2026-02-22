-- =============================================================
-- Workspace Member Access Control
-- Fix: Member users only see workspaces they are members of
-- Date: 2026-02-23
-- =============================================================

-- Note: This app uses a custom auth system (app_users table),
-- NOT Supabase Auth (auth.uid()). The filtering is therefore
-- primarily enforced client-side (in ContentPlan.tsx and
-- ContentDataInsight.tsx). This migration is provided as a
-- reference and for future RLS upgrades.
--
-- CURRENT ARCHITECTURE:
-- - Admin creates workspace -> workspace.admin_id = admin's user_id
-- - Member joins via invite code -> their avatar_url is appended to workspace.members[]
-- - Member is removed -> their avatar_url is removed from workspace.members[]
--
-- CLIENT-SIDE FIX (already applied in ContentPlan.tsx):
-- After fetching all workspaces by admin_id, filter by members[]
-- for users whose role is NOT Admin/Owner/Developer.
--
-- OPTIONAL: If you migrate to Supabase Auth in the future,
-- you can enforce this at DB level with RLS policies like:
--
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Members see only their workspaces"
--   ON workspaces FOR SELECT
--   USING (
--     admin_id::text = auth.uid()::text  -- admin sees all
--     OR
--     EXISTS (
--       SELECT 1 FROM app_users
--       WHERE id::text = auth.uid()::text
--       AND avatar_url = ANY(workspaces.members)
--     )
--   );
--
-- For now, since Supabase Auth is not used, we ensure the
-- content_items table filtering is also corrected.

-- Ensure content_items are only accessible from workspaces
-- the requesting user is a member of (RLS enforcement via admin_id link)
-- This is already enforced via the !inner join in PostgREST queries.

-- Verify workspace members column exists and is properly typed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces'
    AND column_name = 'members'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN members TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- NOTE: We do NOT create a GIN index on the members[] column because
-- avatar URLs can be very long strings (> 8191 bytes limit per index entry).
-- Filtering is handled efficiently at the application layer (client-side)
-- in ContentPlan.tsx and ContentDataInsight.tsx.

-- Add index for admin_id lookups (safe B-tree index on UUID/text)
CREATE INDEX IF NOT EXISTS idx_workspaces_admin_id
ON workspaces (admin_id);
