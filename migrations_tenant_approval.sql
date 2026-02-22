ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES app_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_approval_requests_admin_id ON approval_requests(admin_id);
