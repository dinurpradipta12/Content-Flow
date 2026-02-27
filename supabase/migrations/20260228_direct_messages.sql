-- =============================================================
-- Migration: Direct Messages (1:1 Chat) + Typing Indicators
-- Date: 2026-02-28
-- Description:
--   Adds tables for:
--   1. direct_messages - 1:1 encrypted chat between users
--   2. chat_typing_indicators - real-time typing status
-- =============================================================

-- 1. Direct Messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sender_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'file'
    is_read BOOLEAN NOT NULL DEFAULT false,
    reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT direct_messages_pkey PRIMARY KEY (id)
);

-- 2. Typing indicators table (for both workspace groups and DMs)
CREATE TABLE IF NOT EXISTS public.chat_typing (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    context_type TEXT NOT NULL DEFAULT 'group', -- 'group' or 'dm'
    context_id TEXT NOT NULL, -- group_id or dm_conversation_id (sorted user IDs)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chat_typing_pkey PRIMARY KEY (id),
    CONSTRAINT chat_typing_unique UNIQUE (user_id, context_id)
);

-- 3. Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow all for direct_messages" ON public.direct_messages;
CREATE POLICY "Allow all for direct_messages" ON public.direct_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for chat_typing" ON public.chat_typing;
CREATE POLICY "Allow all for chat_typing" ON public.chat_typing FOR ALL USING (true) WITH CHECK (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON public.direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_typing_context ON public.chat_typing(context_id);

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;

-- =============================================================
-- VERIFICATION:
-- SELECT * FROM public.direct_messages LIMIT 5;
-- SELECT * FROM public.chat_typing LIMIT 5;
-- =============================================================
