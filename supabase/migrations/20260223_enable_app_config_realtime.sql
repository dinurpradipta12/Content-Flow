-- Enable realtime for app_config
DO $$
BEGIN
    -- Add the app_config table to the supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'app_config'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_config;
    END IF;
END $$;
