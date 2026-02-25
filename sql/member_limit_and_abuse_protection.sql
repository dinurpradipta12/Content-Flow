-- File: sql/member_limit_and_abuse_protection.sql
-- Run this in Supabase SQL Editor

-- 1. Add member_limit and device_fingerprint to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS member_limit integer DEFAULT 2;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS device_fingerprint text;

-- 2. Update existing admins to have a default limit if they don't have one
-- Let's say Team 10 has 10, Team 5 has 5, etc.
UPDATE public.app_users 
SET member_limit = CASE 
    WHEN subscription_package ILIKE '%Team 5%' THEN 5
    WHEN subscription_package ILIKE '%Team 10%' THEN 10
    WHEN subscription_package ILIKE '%Personal%' THEN 1
    WHEN subscription_package ILIKE '%Free%' THEN 2
    ELSE 2
END
WHERE role = 'Admin' AND member_limit = 2;

-- 3. Create a view or function to check abuse
CREATE OR REPLACE FUNCTION check_trial_abuse(fingerprint_check text)
RETURNS integer AS $$
DECLARE
    account_count integer;
BEGIN
    SELECT count(*) INTO account_count 
    FROM public.app_users 
    WHERE device_fingerprint = fingerprint_check AND subscription_package ILIKE '%Free%';
    
    RETURN account_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
