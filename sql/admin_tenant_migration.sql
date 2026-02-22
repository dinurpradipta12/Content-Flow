ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_app_users_admin_id ON public.app_users(admin_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_admin_id ON public.workspaces(admin_id);
