-- File: sql/update_whatsapp_number.sql
-- Run this in Supabase SQL Editor to update the developer's WhatsApp number

UPDATE public.app_config 
SET payment_config = jsonb_set(
    COALESCE(payment_config, '{}'::jsonb), 
    '{whatsappNumber}', 
    '"6289619941101"'
)
WHERE id = 1;
