-- =============================================================
-- Migration: Add workspace_type column to workspaces table
-- Date: 2026-02-28
-- Description:
--   Adds a 'workspace_type' column to distinguish between:
--   - 'personal': Only visible to explicitly invited members
--   - 'team': Visible to all members who have joined the workspace
--             (via invitation or invitation code)
--
-- This also fixes the bug where invited users (via admin invite)
-- could see ALL workspaces owned by the admin, instead of only
-- the workspaces they were explicitly added to.
-- =============================================================

-- 1. Add workspace_type column with default 'team' for backward compatibility
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS workspace_type TEXT NOT NULL DEFAULT 'team' 
CHECK (workspace_type IN ('personal', 'team'));

-- 2. Add comment for documentation
COMMENT ON COLUMN public.workspaces.workspace_type IS 
'Workspace visibility type: 
 - personal: Only visible to explicitly invited members (added to members array)
 - team: Visible to all workspace members who joined via invite or invitation code';

-- 3. Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_workspaces_type 
ON public.workspaces(workspace_type);

-- =============================================================
-- VERIFICATION QUERY (run after migration to verify):
-- =============================================================
-- SELECT id, name, workspace_type, owner_id, array_length(members, 1) as member_count
-- FROM public.workspaces
-- ORDER BY created_at DESC
-- LIMIT 20;
