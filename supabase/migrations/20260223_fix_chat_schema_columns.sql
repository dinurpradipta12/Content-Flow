-- FIX: Add missing 'icon' column to workspace_chat_groups
-- This is needed because 'create table if not exists' does not add columns to existing tables.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='workspace_chat_groups' AND column_name='icon'
    ) THEN
        ALTER TABLE public.workspace_chat_groups ADD COLUMN icon TEXT DEFAULT 'users';
    END IF;
END $$;

-- Also ensure other columns in workspace_chat_messages are present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='workspace_chat_messages' AND column_name='type'
    ) THEN
        ALTER TABLE public.workspace_chat_messages ADD COLUMN type TEXT DEFAULT 'text';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='workspace_chat_messages' AND column_name='reply_to_id'
    ) THEN
        ALTER TABLE public.workspace_chat_messages ADD COLUMN reply_to_id UUID REFERENCES public.workspace_chat_messages(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='workspace_chat_messages' AND column_name='metadata'
    ) THEN
        ALTER TABLE public.workspace_chat_messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonB;
    END IF;
END $$;
