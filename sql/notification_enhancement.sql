-- NOTIFICATION SYSTEM ENHANCEMENT 2026
-- Copy and paste this into your Supabase SQL Editor

-- 1. Ensure notifications table has metadata support
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 2. Index for faster duplicate check (H-1 logic)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_metadata ON public.notifications (recipient_id, (metadata->>'content_id'));

-- 3. Policy Cleanup (Allowing broader notification access for teamwork)
-- Ensure users can see notifications meant for them
DROP POLICY IF EXISTS "Enable all access" ON public.notifications;
CREATE POLICY "Enable all access" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Realtime for notifications (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
