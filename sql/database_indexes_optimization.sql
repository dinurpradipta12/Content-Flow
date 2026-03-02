-- 🚀 SETUP DATABASE INDEXES UNTUK OPTIMASI PERFORMA
-- Jalankan script ini di Supabase SQL Editor

-- ============================================
-- 1. WORKSPACE QUERIES OPTIMIZATION
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id 
  ON public.workspaces(owner_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_admin_id 
  ON public.workspaces(admin_id);

-- Composite index untuk member queries (lebih efisien daripada GIN)
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at 
  ON public.workspaces(created_at DESC);

-- ============================================
-- 2. CONTENT ITEMS QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_content_items_workspace_id 
  ON public.content_items(workspace_id);

-- Composite untuk filtering by workspace + status (sangat penting!)
CREATE INDEX IF NOT EXISTS idx_content_items_workspace_status 
  ON public.content_items(workspace_id, status);

-- ============================================
-- 3. APPROVAL REQUESTS OPTIMIZATION
-- ============================================

CREATE INDEX IF NOT EXISTS idx_approval_requests_admin_id 
  ON public.approval_requests(admin_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_id 
  ON public.approval_requests(requester_id);

-- Composite untuk status filtering
CREATE INDEX IF NOT EXISTS idx_approval_requests_status 
  ON public.approval_requests(status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_template_id 
  ON public.approval_requests(template_id);

-- ============================================
-- 4. APPROVAL LOGS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_approval_logs_request_id 
  ON public.approval_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_approval_logs_user_id 
  ON public.approval_logs(user_id);

-- ============================================
-- 5. NOTIFICATIONS (jika ada)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id 
  ON public.notifications(recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON public.notifications(created_at DESC);

-- ============================================
-- 6. MESSAGES / CHAT
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspace_chat_messages_group_id 
  ON public.workspace_chat_messages(group_id);

CREATE INDEX IF NOT EXISTS idx_workspace_chat_messages_created_at 
  ON public.workspace_chat_messages(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_chat_groups_workspace_id 
  ON public.workspace_chat_groups(workspace_id);

-- ============================================
-- 7. TEAM KPI
-- ============================================

CREATE INDEX IF NOT EXISTS idx_team_kpis_created_at 
  ON public.team_kpis(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_members_admin_id 
  ON public.team_members(admin_id);

-- ============================================
-- 8. APP USERS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_app_users_id 
  ON public.app_users(id);

-- ============================================
-- VERIFY INDEXES CREATED
-- ============================================

-- Jalankan query ini untuk lihat semua indexes yang sudah dibuat:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;
