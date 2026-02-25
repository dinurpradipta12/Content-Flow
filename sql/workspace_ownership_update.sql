-- 1. Ensure owner_id column exists
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS owner_id uuid;

-- 2. Populate owner_id for legacy workspaces (Set owner_id = admin_id)
-- This assumes that the person who owns the tenant (admin_id) created the initial workspaces.
UPDATE public.workspaces 
SET owner_id = admin_id 
WHERE owner_id IS NULL;

-- 3. (Optional) Ensure RLS policies respect owner_id
-- If you want to reinforce this at the database level:
-- DROP POLICY IF EXISTS "Workspace access policy" ON public.workspaces;
-- CREATE POLICY "Workspace access policy" ON public.workspaces FOR ALL
-- USING (
--   auth.uid() = owner_id OR 
--   members ? auth.avatar_url_or_something -- This would require user avatar to be linked to auth.uid()
-- );
