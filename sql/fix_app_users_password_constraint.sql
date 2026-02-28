-- Fix NOT NULL constraint on password column in app_users table
-- Password should be nullable since it's stored in Supabase Auth, not in public profile

ALTER TABLE app_users 
ALTER COLUMN password DROP NOT NULL;

-- Also make sure these columns are nullable if they should be optional
ALTER TABLE app_users 
ALTER COLUMN subscription_code DROP NOT NULL;

ALTER TABLE app_users 
ALTER COLUMN subscription_end DROP NOT NULL;

-- Add default values for commonly queried fields
ALTER TABLE app_users 
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE app_users 
ALTER COLUMN is_verified SET DEFAULT false;
