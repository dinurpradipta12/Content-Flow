ALTER TABLE team_members ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES app_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_team_members_admin_id ON team_members(admin_id);
