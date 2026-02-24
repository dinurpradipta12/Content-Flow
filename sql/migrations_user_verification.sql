-- Add verification and subscription code columns to app_users table
-- Run this in Supabase SQL Editor

ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS subscription_code TEXT DEFAULT NULL;

-- Update existing Developer accounts to be verified by default
UPDATE app_users SET is_verified = TRUE WHERE role = 'Developer';

-- Enable realtime for app_users table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
