-- Create developer_inbox table for verification confirmation messages
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS developer_inbox (
    id uuid not null default gen_random_uuid(),
    sender_name text not null,
    sender_email text not null,
    sender_username text not null,
    subscription_code text not null,
    user_id uuid not null,
    message text not null,
    is_read boolean default false,
    is_resolved boolean default false,
    created_at timestamptz default now(),
    constraint developer_inbox_pkey primary key (id)
);

-- Enable RLS
ALTER TABLE developer_inbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON developer_inbox;
CREATE POLICY "Enable all access" ON developer_inbox FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE developer_inbox;

-- Add parent_user_id column to app_users for tracking invited users
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS parent_user_id uuid DEFAULT NULL;

-- Add invited_by column to track who invited the user
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS invited_by text DEFAULT NULL;
