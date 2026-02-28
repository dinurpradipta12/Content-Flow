-- Add Web App Icon Support to app_config
-- This allows global management of favicon, home screen icons, and PWA icons

ALTER TABLE app_config
ADD COLUMN IF NOT EXISTS app_icon_192 TEXT,
ADD COLUMN IF NOT EXISTS app_icon_512 TEXT,
ADD COLUMN IF NOT EXISTS app_icon_mask TEXT,
ADD COLUMN IF NOT EXISTS icon_updated_at TIMESTAMP DEFAULT NOW();

-- Create an icons changelog table to track changes
CREATE TABLE IF NOT EXISTS app_icons_history (
    id BIGSERIAL PRIMARY KEY,
    favicon_url TEXT,
    icon_192_url TEXT,
    icon_512_url TEXT,
    icon_mask_url TEXT,
    changed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Enable RLS on icons history
ALTER TABLE app_icons_history ENABLE ROW LEVEL SECURITY;

-- Allow only developers/admins to view history
CREATE POLICY "Developers can view app icons history"
    ON app_icons_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM app_users
            WHERE id = auth.uid() AND role = 'Developer'
        )
    );

-- Allow only developers to insert changes
CREATE POLICY "Developers can log app icons changes"
    ON app_icons_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_users
            WHERE id = auth.uid() AND role = 'Developer'
        )
    );
