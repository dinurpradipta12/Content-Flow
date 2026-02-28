-- ── Web Push Subscriptions Table ─────────────────────────────────────────────
-- Run this migration to enable Web Push Notifications
--
-- After running this SQL:
-- 1. Generate VAPID keys: npx web-push generate-vapid-keys
-- 2. Add VITE_VAPID_PUBLIC_KEY to .env
-- 3. Add VAPID_PRIVATE_KEY + VAPID_EMAIL to Supabase Edge Function secrets
-- 4. Deploy the send-push Edge Function (see supabase/functions/send-push/)

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for Edge Function to send pushes)
CREATE POLICY "Service role can read all push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    TO service_role
    USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();
