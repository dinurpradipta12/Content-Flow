-- =============================================================
-- Fix: Workspace Members Visibility Issue
-- Root Cause: Members (non-admin users) couldn't fetch workspaces where they are members
-- Solution: Simplify query strategy - fetch all, filter by membership at application level
-- Date: 2026-02-27
-- =============================================================

-- ANALYSIS OF THE PROBLEM:
-- ========================
-- 1. app_users table has id (UUID) and avatar_url (string)
-- 2. workspaces.members is stored as TEXT[] array
-- 3. Members array can contain either:
--    - user IDs (format: UUID as string)
--    - avatar URLs (format: long string URLs, sometimes encoded)
--    - combinations of both (data inconsistency)
--
-- 4. PostgREST query with members.cs.{"..."} filters are fragile:
--    - Works for simple values
--    - Fails with encoded URLs or multiple data types
--    - Causes queries to return 0 results even when membership exists
--
-- FIX STRATEGY:
-- =============
-- Remove complex PostgREST member filtering
-- Move ALL filtering to application layer (React/TypeScript)
-- This is already done in ContentPlan.tsx and ContentDataInsight.tsx
-- Just need to ensure:
-- 1. All workspaces are returned in initial query (no member filter in SQL)
-- 2. Application layer filters by:
--    a. owner_id == userId
--    b. owner_id == tenantId (admin workspace)
--    c. userId in members[] array
--    d. userAvatar in members[] array
--
-- PERFORMANCE: Index on owner_id is key since non-admin users will get
-- fewer rows back (only owner_id matches)

-- Ensure owner_id index exists for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id 
ON public.workspaces(owner_id);

-- Optional: Add index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at 
ON public.workspaces(created_at DESC);

-- =============================================================
-- DATA CLEANUP (Optional but Recommended):
-- =============================================================
-- If you have data consistency issues with members array, run:
--
-- -- Check for workspaces with problematic members entries:
-- SELECT id, members, owner_id FROM workspaces 
-- WHERE members IS NOT NULL 
-- AND (array_length(members, 1) > 100 OR array_length(members, 1) < 0);
--
-- -- Remove duplicate/malformed entries:
-- UPDATE workspaces 
-- SET members = array_remove(array_remove(members, ''), NULL)
-- WHERE members IS NOT NULL;
--
-- =============================================================

-- For Debugging: Check which workspaces are accessible to a user
-- Replace 'user_id_here' with actual UUID:
-- SELECT w.id, w.name, w.owner_id, w.members
-- FROM workspaces w
-- WHERE w.owner_id = 'user_id_here'
--    OR 'user_id_here' = ANY(w.members);
