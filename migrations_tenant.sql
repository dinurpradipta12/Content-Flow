ALTER TABLE app_users ADD COLUMN IF NOT EXISTS admin_id uuid;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS owner_id uuid;
